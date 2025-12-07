
import { EffectParams } from '../../types';
import { makeTubeCurve } from '../audioUtils';

export class BassAmp {
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

    // Bass Tone Stack Centers
    this.toneStackLow = ctx.createBiquadFilter();
    this.toneStackLow.type = 'lowshelf';
    this.toneStackLow.frequency.value = 60; 

    this.toneStackMid = ctx.createBiquadFilter();
    this.toneStackMid.type = 'peaking';
    this.toneStackMid.frequency.value = 300;
    this.toneStackMid.Q.value = 0.6;

    this.toneStackHigh = ctx.createBiquadFilter();
    this.toneStackHigh.type = 'highshelf';
    this.toneStackHigh.frequency.value = 2000;
    
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
      // Cleaner headroom for bass usually
      const drive = params.distortion * 0.8;
      this.tubeStage.curve = makeTubeCurve(drive);
      
      this.toneStackLow.gain.setTargetAtTime(params.eqLow, time, 0.1);
      this.toneStackMid.gain.setTargetAtTime(params.eqMid, time, 0.1);
      this.toneStackHigh.gain.setTargetAtTime(params.eqHigh, time, 0.1);
  }
}
