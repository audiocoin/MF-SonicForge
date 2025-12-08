
export class CabinetSimulator {
  input: GainNode;
  output: GainNode;
  private convolver: ConvolverNode;
  private bypassNode: GainNode;
  private wetNode: GainNode;
  private ctx: BaseAudioContext;
  private currentModel: string = 'bypass';

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.bypassNode = ctx.createGain();
    this.wetNode = ctx.createGain();

    // Routing
    // Path 1: Bypass (No Cab)
    this.input.connect(this.bypassNode).connect(this.output);

    // Path 2: Cab Sim (Convolver)
    this.input.connect(this.convolver).connect(this.wetNode).connect(this.output);
    
    // Default State
    this.bypassNode.gain.value = 1;
    this.wetNode.gain.value = 0;
  }

  async loadImpulse(blob: Blob) {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        // Decode logic depends on context type. OfflineContext vs AudioContext.
        // We assume ctx is standard AudioContext for decoding usually.
        // If ctx is OfflineAudioContext, decodeAudioData might not exist on the instance in older types,
        // but modern browsers support it. Alternatively we create a temp context.
        const tempCtx = new AudioContext(); 
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        
        this.convolver.buffer = audioBuffer;
        this.currentModel = 'custom';
        this.updateMix('custom');
      } catch (e) {
          console.error("Failed to load IR", e);
      }
  }

  update(model: string) {
      if (this.currentModel === model && model !== 'custom') return;
      
      this.currentModel = model;
      
      if (model === 'bypass') {
          this.updateMix('bypass');
      } else if (model === 'custom') {
          // Expects buffer to be loaded already via loadImpulse
          this.updateMix('custom');
      } else {
          this.generateSyntheticIR(model);
          this.updateMix('wet');
      }
  }

  private updateMix(mode: 'bypass' | 'wet' | 'custom') {
      const now = this.ctx.currentTime;
      if (mode === 'bypass') {
          this.bypassNode.gain.setTargetAtTime(1, now, 0.05);
          this.wetNode.gain.setTargetAtTime(0, now, 0.05);
      } else {
          this.bypassNode.gain.setTargetAtTime(0, now, 0.05);
          this.wetNode.gain.setTargetAtTime(1, now, 0.05);
      }
  }

  private generateSyntheticIR(type: string) {
      const rate = this.ctx.sampleRate;
      const length = rate * 0.1; // 100ms impulse
      const buffer = this.ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);
      
      // Generate noise burst
      for(let i=0; i<length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rate * 0.02)); 
      }

      // We can't easily filter a buffer array directly without a graph.
      // So we render it offline to shape the tone.
      const offline = new OfflineAudioContext(1, length, rate);
      const source = offline.createBufferSource();
      source.buffer = buffer;
      
      // Tone Shaping
      const lowCut = offline.createBiquadFilter();
      lowCut.type = 'highpass';
      
      const highCut = offline.createBiquadFilter();
      highCut.type = 'lowpass';
      
      const midScoop = offline.createBiquadFilter();
      midScoop.type = 'peaking';
      midScoop.Q.value = 1;
      midScoop.gain.value = -5;

      if (type.includes('4x12')) {
          lowCut.frequency.value = 80;
          highCut.frequency.value = 5000;
          midScoop.frequency.value = 400;
      } else {
          // 1x12 or others
          lowCut.frequency.value = 120;
          highCut.frequency.value = 4000;
          midScoop.frequency.value = 800; 
          midScoop.gain.value = 3; // Mid boost for small cabs
      }
      
      source.connect(lowCut).connect(highCut).connect(midScoop).connect(offline.destination);
      source.start();
      
      offline.startRendering().then(rendered => {
          this.convolver.buffer = rendered;
      });
  }
}
