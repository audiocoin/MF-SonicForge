
export interface DrumChannelParams {
  volume: number;
  pan: number;
  pitch: number;
  mute: boolean;
  solo: boolean;
}

class DrumChannel {
  ctx: AudioContext;
  buffer: AudioBuffer | null = null;
  output: GainNode;
  panner: StereoPannerNode;
  params: DrumChannelParams;
  
  constructor(ctx: AudioContext, buffer: AudioBuffer | null = null) {
    this.ctx = ctx;
    this.buffer = buffer;
    
    // Default Params
    this.params = {
      volume: 0.8,
      pan: 0,
      pitch: 1.0,
      mute: false,
      solo: false
    };

    // Audio Graph: Input (Source) -> Panner -> Volume -> Output
    this.output = ctx.createGain();
    this.panner = ctx.createStereoPanner();
    
    this.panner.connect(this.output);
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  setVolume(val: number) { 
    this.params.volume = val;
    // Smooth transition
    this.output.gain.setTargetAtTime(this.params.mute ? 0 : val, this.ctx.currentTime, 0.05);
  }

  setPan(val: number) {
    this.params.pan = val;
    this.panner.pan.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setPitch(val: number) {
    this.params.pitch = val;
  }

  setMute(muted: boolean) {
    this.params.mute = muted;
    this.output.gain.setTargetAtTime(muted ? 0 : this.params.volume, this.ctx.currentTime, 0.05);
  }

  trigger(time: number) {
    if (this.params.mute || !this.buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    
    // Acid Style Pitch Shifting (Resampling)
    source.playbackRate.value = this.params.pitch;

    // Per-hit envelope for cleaner sound (Acid one-shot style)
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(1.0, time);
    envelope.gain.exponentialRampToValueAtTime(0.01, time + (this.buffer.duration / this.params.pitch));

    source.connect(envelope).connect(this.panner);
    source.start(time);
  }
}

export class DrumEngine {
  audioContext: AudioContext | null = null;
  masterBus: GainNode | null = null;
  compressor: DynamicsCompressorNode | null = null;
  
  channels: DrumChannel[] = [];
  pattern: boolean[][] = Array(4).fill(null).map(() => Array(16).fill(false));
  
  tempo: number = 120;
  isPlaying: boolean = false;
  currentStep: number = 0;
  nextNoteTime: number = 0;
  timerID: number | undefined;
  
  onStepChange: (step: number) => void;

  constructor(onStepChange: (step: number) => void) {
    this.onStepChange = onStepChange;
  }

  async init() {
    if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();

    if (!this.masterBus) {
        // Master Bus Chain: Channels -> MasterGain -> Compressor -> Destination
        this.masterBus = this.audioContext.createGain();
        this.masterBus.gain.value = 0.9; // Headroom
        
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.005;
        this.compressor.release.value = 0.1;
        
        this.masterBus.connect(this.compressor).connect(this.audioContext.destination);

        // Initialize Channels
        await this.createChannels();
    }
  }

  async createChannels() {
     if (!this.audioContext || !this.masterBus) return;
     const ctx = this.audioContext;
     
     // Generate High Quality Synthesized Samples
     const buffers = [
        this.createKick(ctx),
        this.createSnare(ctx),
        this.createHiHat(ctx),
        this.createTom(ctx)
     ];

     this.channels = buffers.map(buf => {
         const ch = new DrumChannel(ctx, buf);
         ch.connect(this.masterBus!);
         return ch;
     });
     
     // Initial Mix
     this.setVolume(0, 0.9); // Kick
     this.setVolume(1, 0.85); // Snare
     this.setVolume(2, 0.6); // HH
     this.setVolume(3, 0.8); // Tom
     
     // Initial Panning (Acid Style stereo spread)
     this.setPan(2, 0.15); // HH slightly right
     this.setPan(3, -0.2); // Tom slightly left
  }

  // --- SYNTHESIS ENGINE (Acid/Analog Style) ---

  createKick(ctx: AudioContext): AudioBuffer {
     const duration = 0.5;
     const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
     const data = buf.getChannelData(0);
     for(let i=0; i<data.length; i++) {
        const t = i / ctx.sampleRate;
        // Pitch envelope: Drop from 180Hz to 50Hz
        const f = 180 * Math.exp(-t * 25);
        // Amp envelope: Punchy attack
        const amp = Math.exp(-t * 8);
        data[i] = Math.sin(2 * Math.PI * f * t) * amp;
        // Add click transient
        if (t < 0.002) data[i] += (Math.random() * 0.5); 
     }
     return buf;
  }

  createSnare(ctx: AudioContext): AudioBuffer {
     const duration = 0.3;
     const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
     const data = buf.getChannelData(0);
     for(let i=0; i<data.length; i++) {
         const t = i / ctx.sampleRate;
         // Body
         const tone = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 15);
         // Snares (Noise)
         const noise = (Math.random() * 2 - 1) * Math.exp(-t * 25);
         data[i] = (tone * 0.4) + (noise * 0.6);
     }
     return buf;
  }

  createHiHat(ctx: AudioContext): AudioBuffer {
     const duration = 0.1;
     const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
     const data = buf.getChannelData(0);
     // High pass noise
     for(let i=0; i<data.length; i++) {
         const t = i / ctx.sampleRate;
         const noise = (Math.random() * 2 - 1);
         // Bandpass-ish filtering by simple math
         if (i > 0) data[i] = (noise - data[i-1]) * Math.exp(-t * 80); 
         else data[i] = noise;
     }
     return buf;
  }

  createTom(ctx: AudioContext): AudioBuffer {
     const duration = 0.4;
     const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
     const data = buf.getChannelData(0);
     for(let i=0; i<data.length; i++) {
         const t = i / ctx.sampleRate;
         const f = 120 * Math.exp(-t * 10);
         data[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6);
     }
     return buf;
  }

  // --- API ---

  setVolume(chIdx: number, vol: number) { this.channels[chIdx]?.setVolume(vol); }
  setPan(chIdx: number, pan: number) { this.channels[chIdx]?.setPan(pan); }
  setPitch(chIdx: number, pitch: number) { this.channels[chIdx]?.setPitch(pitch); }
  setMute(chIdx: number, mute: boolean) { this.channels[chIdx]?.setMute(mute); }
  
  toggleStep(instIdx: number, stepIdx: number) { 
      this.pattern[instIdx][stepIdx] = !this.pattern[instIdx][stepIdx]; 
  }
  
  setTempo(bpm: number) { this.tempo = bpm; }
  
  clear() { 
      this.pattern = Array(4).fill(null).map(() => Array(16).fill(false)); 
      if (!this.isPlaying) this.onStepChange(-1);
  }

  // --- SCHEDULER (Web Audio Precise Timing) ---

  async start() {
      await this.init();
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.currentStep = 0;
      this.nextNoteTime = this.audioContext!.currentTime + 0.1;
      this.scheduler();
  }

  stop() {
      this.isPlaying = false;
      window.clearTimeout(this.timerID);
      this.onStepChange(-1);
  }

  private scheduler() {
      if (!this.audioContext) return;
      // Lookahead: Schedule notes that are coming up within 0.1s
      while (this.nextNoteTime < this.audioContext.currentTime + 0.1) {
          this.scheduleStep(this.currentStep, this.nextNoteTime);
          this.advanceStep();
      }
      this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  private advanceStep() {
      const secondsPerBeat = 60.0 / this.tempo;
      // 16th notes = 0.25 beats
      this.nextNoteTime += 0.25 * secondsPerBeat;
      this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(step: number, time: number) {
      // Visual callback sync
      const delay = (time - this.audioContext!.currentTime) * 1000;
      setTimeout(() => {
          if (this.isPlaying) this.onStepChange(step);
      }, Math.max(0, delay));

      // Audio Trigger
      this.pattern.forEach((row, chIdx) => {
          if (row[step]) {
             this.channels[chIdx]?.trigger(time);
          }
      });
  }
}
