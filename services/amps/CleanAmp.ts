
import { EffectParams } from '../../types';
import { makeTubeCurve } from '../audioUtils';

export class CleanAmp {
  input: GainNode;
  output: GainNode;
  
  private preAmpGain: GainNode;
  private tubeStage: WaveShaperNode;
  private toneStackLow: BiquadFilterNode;
  private toneStackMid: BiquadFilterNode;
  private toneStackHigh: BiquadFilterNode;
  private masterGain: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.preAmpGain = ctx.createGain(); 
    this.tubeStage = ctx.createWaveShaper(); 
    this.tubeStage.oversample = '4x';

    // American Clean Tone Stack Centers
    this.toneStackLow = ctx.createBiquadFilter();
    this.toneStackLow.type = 'lowshelf';
    this.toneStackLow.frequency.value = 100; 

    this.toneStackMid = ctx.createBiquadFilter();
    this.toneStackMid.type = 'peaking';
    this.toneStackMid.frequency.value = 500;
    this.toneStackMid.Q.value = 0.5;

    this.toneStackHigh = ctx.createBiquadFilter();
    this.toneStackHigh.type = 'highshelf';
    this.toneStackHigh.frequency.value = 4000;
    
    this.masterGain = ctx.createGain();

    // Chain
    this.input.connect(this.preAmpGain);
    this.preAmpGain.connect(this.tubeStage);
    this.tubeStage.connect(this.toneStackLow);
    this.toneStackLow.connect(this.toneStackMid);
    this.toneStackMid.connect(this.toneStackHigh);
    this.toneStackHigh.connect(this.masterGain);
    this.masterGain.connect(this.output);
  }

  update(params: EffectParams, time: number) {
      // Clean amps typically have less pre-amp gain available
      const drive = Math.max(0, params.distortion * 0.6); 
      this.tubeStage.curve = makeTubeCurve(drive);
      
      // EQ
      this.toneStackLow.gain.setTargetAtTime(params.eqLow, time, 0.1);
      this.toneStackMid.gain.setTargetAtTime(params.eqMid, time, 0.1);
      this.toneStackHigh.gain.setTargetAtTime(params.eqHigh, time, 0.1);
  }
}
