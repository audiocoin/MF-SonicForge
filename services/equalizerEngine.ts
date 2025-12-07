
import { EffectParams } from '../types';

export class EqualizerEngine {
  input: GainNode;
  output: GainNode;
  bands: BiquadFilterNode[] = [];
  bandFreqs = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  constructor(ctx: BaseAudioContext) {
    this.input = ctx.createGain();
    
    // Create Bands
    this.bands = this.bandFreqs.map(f => {
        const node = ctx.createBiquadFilter();
        node.type = 'peaking';
        node.frequency.value = f;
        node.Q.value = 1.41; 
        return node;
    });

    // Chain Bands: Input -> Band1 -> Band2 ... -> Output
    let current: AudioNode = this.input;
    for (const band of this.bands) {
        current.connect(band);
        current = band;
    }
    
    this.output = ctx.createGain();
    current.connect(this.output);
  }

  update(params: EffectParams, time: number) {
      const eqValues = [
          params.eq63, params.eq125, params.eq250, params.eq500, 
          params.eq1k, params.eq2k, params.eq4k, params.eq8k, params.eq16k
      ];
      
      this.bands.forEach((band, i) => {
          band.gain.setTargetAtTime(eqValues[i] || 0, time, 0.1);
      });
  }
}
