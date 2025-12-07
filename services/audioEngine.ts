
import { EffectParams, JamBlueprint } from '../types';
import { audioBufferToWav } from './audioUtils';
import { PedalEngine } from './pedalEngine';
import { AmpEngine } from './ampEngine';
import { EqualizerEngine } from './equalizerEngine';

// --- Modular Effects Engine ---

interface ModularVoiceGraph {
  input: GainNode;
  output: DynamicsCompressorNode;
  pedals: PedalEngine;
  amp: AmpEngine;
  eq: EqualizerEngine;
  update: (params: EffectParams, time: number) => void;
}

function buildModularGraph(ctx: BaseAudioContext): ModularVoiceGraph {
  const inputGain = ctx.createGain();
  const masterLimiter = ctx.createDynamicsCompressor();
  masterLimiter.threshold.value = -0.5;
  masterLimiter.knee.value = 0;
  masterLimiter.ratio.value = 20; 
  masterLimiter.attack.value = 0.001;
  masterLimiter.release.value = 0.1;

  const masterGain = ctx.createGain();

  // Instantiate Sub-Engines
  const pedalEngine = new PedalEngine(ctx);
  const ampEngine = new AmpEngine(ctx);
  const eqEngine = new EqualizerEngine(ctx);

  // Chain: Input -> Pedal Pre -> Amp -> EQ -> Pedal Post -> Master
  inputGain.connect(pedalEngine.inputPre);
  pedalEngine.outputPre.connect(ampEngine.input);
  ampEngine.output.connect(eqEngine.input);
  eqEngine.output.connect(pedalEngine.inputPost);
  pedalEngine.outputPost.connect(masterGain);
  masterGain.connect(masterLimiter);

  return {
    input: inputGain,
    output: masterLimiter,
    pedals: pedalEngine,
    amp: ampEngine,
    eq: eqEngine,
    update: (params: EffectParams, time: number) => {
       inputGain.gain.setTargetAtTime(params.gain, time, 0.05);
       pedalEngine.update(params, time, ctx);
       ampEngine.update(params, time);
       eqEngine.update(params, time);
    }
  };
}

export class EffectsEngine {
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  voiceGraph: ModularVoiceGraph | null = null;
  micGate: GainNode | null = null;
  monitorGate: GainNode | null = null;
  recorderNode: ScriptProcessorNode | null = null;
  recordingBuffers: Float32Array[] = [];
  isRecording: boolean = false;
  rawStreamNode: MediaStreamAudioSourceNode | null = null;
  previewSource: AudioBufferSourceNode | null = null;
  isMonitorOn: boolean = false;

  constructor(config?: any) {}

  static async getAudioInputs() {
    try {
        // Do NOT call getUserMedia here, as it triggers the mic permission prompt automatically.
        // We only list devices. Labels might be empty until permission is granted elsewhere.
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'audioinput');
    } catch(e) {
        return [];
    }
  }

  async startMic(deviceId?: string) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    
    // If we already have a stream and it matches the deviceId (or no specific device requested), reuse it
    if (this.rawStreamNode) {
        const currentTrack = this.rawStreamNode.mediaStream.getAudioTracks()[0];
        const currentSettings = currentTrack.getSettings();
        if (!deviceId || currentSettings.deviceId === deviceId) {
            // Stream exists and is valid, just ensure gates are open
            if (this.micGate) this.micGate.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.1);
            return;
        }
        // If device ID changed, stop old stream
        this.stopMicStream();
    }

    const constraints = { audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    this.rawStreamNode = this.audioContext.createMediaStreamSource(stream);
    if (!this.analyser) { this.analyser = this.audioContext.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = 0.8; }
    if (!this.micGate) this.micGate = this.audioContext.createGain();
    if (!this.monitorGate) this.monitorGate = this.audioContext.createGain();
    
    // Build Modular Graph
    if (!this.voiceGraph) { 
        this.voiceGraph = buildModularGraph(this.audioContext); 
        this.voiceGraph.output.connect(this.monitorGate); 
        this.monitorGate.connect(this.audioContext.destination); 
    }
    
    this.rawStreamNode.connect(this.micGate);
    this.micGate.connect(this.voiceGraph.input);
    try { this.voiceGraph.input.connect(this.analyser); } catch(e) {}
    
    // Restore monitor state logic
    this.setMonitor(this.isMonitorOn);
    this.micGate.gain.value = 1; 
  }

  stopMicStream() {
    if (this.micGate && this.audioContext) {
        // Fade out before disconnect to avoid pop
        this.micGate.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
    }
    
    setTimeout(() => {
        if (this.rawStreamNode) {
            this.rawStreamNode.mediaStream.getTracks().forEach(t => t.stop());
            this.rawStreamNode.disconnect();
            this.rawStreamNode = null;
        }
    }, 100);
  }

  setMonitor(on: boolean) {
    this.isMonitorOn = on;
    if (this.monitorGate && this.audioContext) {
      this.monitorGate.gain.setTargetAtTime(on ? 1 : 0, this.audioContext.currentTime, 0.1);
    }
  }

  startRecording() {
    if (!this.rawStreamNode || !this.audioContext) return;
    this.isRecording = true;
    this.recordingBuffers = [];
    this.recorderNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.rawStreamNode.connect(this.recorderNode);
    this.recorderNode.connect(this.audioContext.destination);
    this.recorderNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const channelData = e.inputBuffer.getChannelData(0);
      this.recordingBuffers.push(new Float32Array(channelData));
    };
  }

  async stopRecording(): Promise<Blob> {
    this.isRecording = false;
    if (this.recorderNode && this.rawStreamNode) {
        this.rawStreamNode.disconnect(this.recorderNode);
        this.recorderNode.disconnect();
        this.recorderNode = null;
    }
    if (this.recordingBuffers.length === 0 || !this.audioContext) return new Blob([]);
    const totalLength = this.recordingBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const resultBuffer = this.audioContext.createBuffer(1, totalLength, this.audioContext.sampleRate);
    const channelData = resultBuffer.getChannelData(0);
    let offset = 0;
    for (const buf of this.recordingBuffers) { channelData.set(buf, offset); offset += buf.length; }
    return audioBufferToWav(resultBuffer);
  }

  updateParams(params: EffectParams) {
    if (this.voiceGraph && this.audioContext) {
      this.voiceGraph.update(params, this.audioContext.currentTime);
    }
  }

  playRaw(blob: Blob, onEnded: () => void, loop: boolean = false) {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') this.audioContext.resume();
    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.stopPreview();
      if (!this.voiceGraph) {
          this.voiceGraph = buildModularGraph(this.audioContext!);
          if (!this.monitorGate) this.monitorGate = this.audioContext!.createGain();
          this.voiceGraph.output.connect(this.monitorGate);
          this.monitorGate.connect(this.audioContext!.destination);
          if (!this.analyser) { this.analyser = this.audioContext!.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = 0.8; }
          this.voiceGraph.input.connect(this.analyser);
      }
      if (this.micGate) this.micGate.gain.value = 0;
      if (this.monitorGate) this.monitorGate.gain.value = 1;
      this.previewSource = this.audioContext!.createBufferSource();
      this.previewSource.buffer = audioBuffer;
      this.previewSource.loop = loop;
      this.previewSource.connect(this.voiceGraph.input);
      this.previewSource.onended = () => { if (!loop) onEnded(); };
      this.previewSource.start();
    };
    reader.readAsArrayBuffer(blob);
  }

  stopPreview() {
    if (this.previewSource) { this.previewSource.stop(); this.previewSource = null; }
  }

  async exportProcessed(blob: Blob, params: EffectParams): Promise<Blob> {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const tempCtx = new AudioContext();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        const offlineCtx = new OfflineAudioContext(2, audioBuffer.length, audioBuffer.sampleRate);
        
        // Build Modular Graph for Offline Context
        const graph = buildModularGraph(offlineCtx);
        
        graph.update(params, 0);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(graph.input);
        graph.output.connect(offlineCtx.destination);
        source.start();
        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        resolve(wavBlob);
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  getVisualizerData(array: Uint8Array) {
    if (this.analyser) { this.analyser.getByteTimeDomainData(array); }
  }

  stop() {
    this.stopMicStream();
    this.audioContext?.close();
    this.audioContext = null;
  }
}

// --- JAM ENGINE ---
export type JamGroove = 'Basic' | 'Rock' | 'Funk' | 'Jazz';

export class JamEngine {
    audioContext: AudioContext | null = null;
    blueprint: JamBlueprint | null = null;
    isPlaying: boolean = false;
    currentChordIdx: number = -1;
    onChordChange: (idx: number) => void;
    tempo: number = 120;
    groove: JamGroove = 'Basic';
    nextNoteTime: number = 0;
    timerID: number | undefined;
    
    // AI Audio Tracks
    aiTracks: Record<string, AudioBuffer> = {};
    aiSources: Record<string, AudioBufferSourceNode> = {};
    trackVolumes: Record<string, number> = { drums: 1, bass: 1, chord: 1, melody: 1 };
    
    // Visualizer
    analyser: AnalyserNode | null = null;
    masterGain: GainNode | null = null;

    constructor(onChordChange: (idx: number) => void) {
        this.onChordChange = onChordChange;
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();
        
        if (!this.masterGain) {
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
        }
        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.masterGain.connect(this.analyser);
        }
    }

    async loadAiTrack(trackName: string, base64PCM: string) {
        await this.init();
        if (!this.audioContext) return;
        
        const byteCharacters = atob(base64PCM);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        
        try {
            const blob = new Blob([byteArray], { type: 'audio/wav' });
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.aiTracks[trackName] = audioBuffer;
        } catch (e) {
            console.warn("WAV decode failed, ignoring track", e);
        }
    }

    loadBlueprint(bp: JamBlueprint) {
        this.blueprint = bp;
        this.tempo = bp.tempo;
    }

    setTempo(t: number) { this.tempo = t; }
    setGroove(g: JamGroove) { this.groove = g; }
    setTrackVolume(track: string, vol: number) { 
        this.trackVolumes[track] = vol; 
    }

    async start() {
        await this.init();
        if (this.isPlaying || !this.audioContext || !this.blueprint) return;
        this.isPlaying = true;
        
        Object.keys(this.aiTracks).forEach(track => {
            if (this.trackVolumes[track] > 0) {
                this.playAiLoop(track);
            }
        });

        this.currentChordIdx = -1;
        this.nextNoteTime = this.audioContext.currentTime + 0.1;
        this.scheduler();
    }

    playAiLoop(track: string) {
        if (!this.audioContext || !this.aiTracks[track]) return;
        const source = this.audioContext.createBufferSource();
        source.buffer = this.aiTracks[track];
        source.loop = true;
        const gain = this.audioContext.createGain();
        gain.gain.value = this.trackVolumes[track];
        source.connect(gain).connect(this.masterGain!);
        source.start();
        this.aiSources[track] = source;
    }

    stop() {
        this.isPlaying = false;
        window.clearTimeout(this.timerID);
        this.onChordChange(-1);
        
        Object.values(this.aiSources).forEach(src => {
            try { src.stop(); } catch(e){}
        });
        this.aiSources = {};
    }

    private scheduler() {
        if (!this.audioContext) return;
        const secondsPerBeat = 60.0 / this.tempo;
        while (this.nextNoteTime < this.audioContext.currentTime + 0.1) {
             this.currentChordIdx = (this.currentChordIdx + 1) % (this.blueprint?.chordProgression.length || 1);
             this.scheduleChord(this.currentChordIdx, this.nextNoteTime);
             this.nextNoteTime += 4 * secondsPerBeat; 
        }
        this.timerID = window.setTimeout(() => this.scheduler(), 25);
    }

    private scheduleChord(idx: number, time: number) {
        const chord = this.blueprint?.chordProgression[idx];
        setTimeout(() => {
            if(this.isPlaying) this.onChordChange(idx);
        }, (time - this.audioContext!.currentTime) * 1000);
        
        if (this.trackVolumes['chord'] > 0 && chord) {
            const root = chord.charAt(0).toUpperCase();
            const freqs: any = { 'C': 261.6, 'D': 293.6, 'E': 329.6, 'F': 349.2, 'G': 392.0, 'A': 440.0, 'B': 493.8 };
            let f = freqs[root] || 440;
            if (chord.includes('#')) f *= 1.059;
            
            const isMinor = chord.includes('m');
            const third = f * (isMinor ? 1.189 : 1.259);
            const fifth = f * 1.498;
            
            [f, third, fifth].forEach((freq, i) => {
                const osc = this.audioContext!.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const gain = this.audioContext!.createGain();
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.1 * this.trackVolumes['chord'], time + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 2); 
                
                osc.connect(gain).connect(this.masterGain!);
                osc.start(time);
                osc.stop(time + 2.5);
            });
        }
    }
    
    getVisualizerData(array: Uint8Array) {
        if (this.analyser) this.analyser.getByteFrequencyData(array);
    }
}
