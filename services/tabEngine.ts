
import { PlayableTabNote, TabTechnique } from '../types';
import { makeTubeCurve, makeFuzzCurve } from './audioUtils';

export type TabInstrumentMode = 'acoustic' | 'clean' | 'distorted';

export class TabEngine {
  audioContext: AudioContext | null = null;
  isPlaying: boolean = false;
  tempo: number = 120;
  notes: PlayableTabNote[] = [];
  startTime: number = 0;
  
  // Settings
  instrumentMode: TabInstrumentMode = 'clean';
  capo: number = 0;
  tuningOffset: number[] = [0, 0, 0, 0, 0, 0]; // Semitone offset per string
  
  // Standard Tuning (E2 to E4) - Base Frequencies for open strings
  // String 6 (Low E) to String 1 (High E)
  baseFreqs = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

  // Master Effects
  masterGain: GainNode | null = null;
  compressor: DynamicsCompressorNode | null = null;
  reverb: ConvolverNode | null = null;

  constructor(tempo: number, notes: PlayableTabNote[]) {
    this.tempo = tempo;
    this.notes = notes;
  }

  setInstrumentMode(mode: TabInstrumentMode) {
    this.instrumentMode = mode;
  }

  setCapo(fret: number) {
    this.capo = fret;
  }

  setTuning(offsets: number[]) {
    if (offsets.length === 6) this.tuningOffset = offsets;
  }
  
  async init() {
    if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();

    // Build Master Chain
    if (!this.masterGain) {
        this.masterGain = this.audioContext.createGain();
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.ratio.value = 4;
        this.compressor.release.value = 0.25;

        // Simple Room Reverb for "Body" resonance
        this.reverb = this.audioContext.createConvolver();
        this.createImpulseResponse(this.audioContext, 0.8, 1.5); // Short, woody decay

        // Chain
        this.masterGain.connect(this.compressor).connect(this.audioContext.destination);
        
        // Wet/Dry mix for reverb handled in note routing
        this.reverb.connect(this.masterGain);
    }
  }
  
  getCurrentTime(): number { return this.audioContext ? this.audioContext.currentTime : 0; }
  
  async play() {
    await this.init();
    if (this.isPlaying || !this.audioContext) return;
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime + 0.1;
    this.scheduleNotes();
  }
  
  stop() { 
    this.isPlaying = false; 
    if (this.audioContext) { 
        this.audioContext.close(); 
        this.audioContext = null; 
        this.masterGain = null;
    } 
  }

  private createImpulseResponse(ctx: AudioContext, duration: number, decay: number) {
      if (!this.reverb) return;
      const length = ctx.sampleRate * duration;
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      const L = impulse.getChannelData(0);
      const R = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
          const n = i / length;
          // Exponential decay noise
          const val = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
          L[i] = val;
          R[i] = val;
      }
      this.reverb.buffer = impulse;
  }
  
  private scheduleNotes() {
    if (!this.audioContext) return;
    const secondsPerBeat = 60.0 / this.tempo;
    
    // Group notes by beat to handle chords/strumming
    const beatMap = new Map<number, PlayableTabNote[]>();
    
    this.notes.forEach(note => {
        const beat = note.beat;
        if (!beatMap.has(beat)) beatMap.set(beat, []);
        beatMap.get(beat)?.push(note);
    });

    // Iterate through beats
    beatMap.forEach((notesInBeat, beat) => {
        const baseTime = this.startTime + (beat * secondsPerBeat);
        
        // Sort notes: Low String (6) -> High String (1) for downstroke simulation
        notesInBeat.sort((a, b) => b.string - a.string);

        // Strumming Logic:
        // If > 2 notes, it's likely a chord. Add 20-30ms offset per string.
        const isChord = notesInBeat.length > 1;
        const strumDelay = isChord ? 0.03 : 0; // 30ms strum

        notesInBeat.forEach((note, index) => {
            const strumOffset = index * strumDelay;
            const finalTime = baseTime + strumOffset;
            const durationSeconds = note.duration * secondsPerBeat;
            this.playNote(note, finalTime, durationSeconds);
        });
    });
  }
  
  private getFrequency(stringIdx: number, fret: number): number {
     const arrIdx = 6 - stringIdx; // 1-6 -> 5-0 mapping
     if (arrIdx < 0 || arrIdx > 5) return 0;
     
     // Apply Tuning Offset + Capo
     const tuningShift = this.tuningOffset[arrIdx]; 
     const effectiveFret = fret + this.capo + tuningShift;
     
     return this.baseFreqs[arrIdx] * Math.pow(2, effectiveFret / 12);
  }

  private playNote(note: PlayableTabNote, time: number, duration: number) {
     if (!this.audioContext || !this.masterGain) return;
     const ctx = this.audioContext;
     
     if (note.technique === 'dead') {
         this.playDeadNote(time);
         return;
     }

     const startFreq = this.getFrequency(note.string, note.fret);
     
     // Handle Harmonics
     let actualFreq = startFreq;
     const isHarmonic = note.technique === 'harmonic';
     if (isHarmonic) {
         if (note.fret === 12) actualFreq = startFreq * 2;
         else if (note.fret === 7) actualFreq = startFreq * 3;
         else if (note.fret === 5) actualFreq = startFreq * 4;
         else actualFreq = startFreq * 2;
     }

     // --- SIGNAL CHAIN ---
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();
     const filter = ctx.createBiquadFilter();
     const panner = ctx.createStereoPanner();
     
     // Waveform & Tone Shaping based on Instrument Mode
     if (this.instrumentMode === 'acoustic') {
         // Bright, crisp
         osc.type = isHarmonic ? 'sine' : 'triangle'; // Triangle is cleaner than Saw
         filter.type = 'highpass';
         filter.frequency.value = 200; // Cut mud
         filter.Q.value = 0.5;
     } else if (this.instrumentMode === 'distorted') {
         // Aggressive
         osc.type = 'sawtooth';
         filter.type = 'lowpass';
         filter.frequency.value = 4000; // Cab sim roll-off
         filter.Q.value = 1.0;
     } else {
         // Clean Electric
         osc.type = isHarmonic ? 'sine' : 'sawtooth'; // Sawtooth filtered is standard guitar
         filter.type = 'lowpass';
         filter.frequency.value = 3000;
         filter.Q.value = 1.0;
     }

     osc.frequency.value = actualFreq;

     // --- TECHNIQUE MODULATION ---
     if (note.technique === 'bend' && note.bendAmount) {
         const targetFreq = actualFreq * Math.pow(2, note.bendAmount / 12);
         osc.frequency.setValueAtTime(actualFreq, time);
         osc.frequency.linearRampToValueAtTime(targetFreq, time + (duration * 0.7)); 
     } else if (note.technique === 'slide' && note.slideTo) {
         const targetFreq = this.getFrequency(note.string, note.slideTo);
         osc.frequency.setValueAtTime(actualFreq, time);
         osc.frequency.exponentialRampToValueAtTime(targetFreq, time + duration);
     }

     if (note.technique === 'vibrato') {
         const lfo = ctx.createOscillator();
         lfo.frequency.value = 5;
         const lfoGain = ctx.createGain();
         lfoGain.gain.value = actualFreq * 0.02;
         lfo.connect(lfoGain).connect(osc.frequency);
         lfo.start(time);
         lfo.stop(time + duration + 0.2);
     }

     // --- ENVELOPE ---
     const isLegato = note.technique === 'hammer' || note.technique === 'pull';
     const attackTime = isLegato ? 0.04 : (this.instrumentMode === 'acoustic' ? 0.01 : 0.005);
     const peakGain = note.technique === 'palmMute' ? 0.3 : 0.5;
     
     gain.gain.setValueAtTime(0, time);
     gain.gain.linearRampToValueAtTime(peakGain, time + attackTime);
     
     if (note.technique === 'palmMute') {
         filter.frequency.setValueAtTime(500, time);
         filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);
         gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15); 
     } else {
         // Standard decay
         const sustainTime = duration + (this.instrumentMode === 'distorted' ? 1.0 : 0.5); // Distortion sustains longer
         gain.gain.exponentialRampToValueAtTime(0.001, time + sustainTime); 
         
         // Filter Envelope (Wah/Pluck effect)
         if (this.instrumentMode !== 'acoustic') {
            const startF = filter.frequency.value;
            filter.frequency.setValueAtTime(startF + 2000, time);
            filter.frequency.exponentialRampToValueAtTime(startF, time + 0.1);
         }
     }

     // --- ROUTING ---
     osc.connect(filter);
     
     // Add Distortion Stage if needed
     if (this.instrumentMode === 'distorted') {
         const shaper = ctx.createWaveShaper();
         shaper.curve = makeTubeCurve(50); // High gain
         shaper.oversample = '4x';
         filter.connect(shaper).connect(gain);
     } else {
         filter.connect(gain);
     }

     // Panning based on string (Slight stereo spread)
     // Low E left (-0.3), High E right (+0.3)
     const pan = ((6 - note.string) / 5) * 0.6 - 0.3; 
     panner.pan.value = pan;

     gain.connect(panner);
     panner.connect(this.masterGain);
     
     // Add Reverb (Body resonance)
     if (this.instrumentMode === 'acoustic' && this.reverb) {
         const revGain = ctx.createGain();
         revGain.gain.value = 0.3;
         gain.connect(revGain).connect(this.reverb);
     }

     osc.start(time);
     osc.stop(time + duration + 1.0); // Allow tail
  }

  private playDeadNote(time: number) {
      if (!this.audioContext || !this.masterGain) return;
      const bufferSize = this.audioContext.sampleRate * 0.05;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200;
      const gain = this.audioContext.createGain();
      
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      noise.connect(filter).connect(gain).connect(this.masterGain);
      noise.start(time);
  }
}
