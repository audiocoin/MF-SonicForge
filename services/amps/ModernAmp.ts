
import { EffectParams } from '../../types';
import { makeTubeCurve } from '../audioUtils';

export class ModernAmp {
  input: GainNode;
  output: GainNode;
  
  private preAmpGain: GainNode;
  private tubeStage: WaveShaperNode;
  private postDriveFilter: BiquadFilterNode; // Tighten up the distortion
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
    
    this.postDriveFilter = ctx.createBiquadFilter();
    this.postDriveFilter.type = 'lowpass';
    this.postDriveFilter.frequency.value = 6000; // Fizz control

    // Modern Scoop Tone Stack Centers
    this.toneStackLow = ctx.createBiquadFilter();
    this.toneStackLow.type = 'lowshelf';
    this.toneStackLow.frequency.value = 80; 

    this.toneStackMid = ctx.createBiquadFilter();
    this.toneStackMid.type = 'peaking';
    this.toneStackMid.frequency.value = 400;
    this.toneStackMid.Q.value = 1.0; // Wider mid scoop capability

    this.toneStackHigh = ctx.createBiquadFilter();
    this.toneStackHigh.type = 'highshelf';
    this.toneStackHigh.frequency.value = 5000;
    
    this.masterGain = ctx.createGain();

    // Chain
    this.input.connect(this.preAmpGain);
    this.preAmpGain.connect(this.tubeStage);
    this.tubeStage.connect(this.postDriveFilter);
    this.postDriveFilter.connect(this.toneStackLow);
    this.toneStackLow.connect(this.toneStackMid);
    this.toneStackMid.connect(this.toneStackHigh);
    this.toneStackHigh.connect(this.masterGain);
    this.masterGain.connect(this.output);
  }

  update(params: EffectParams, time: number) {
      // Modern amps have aggressive gain
      const drive = Math.min(100, params.distortion * 1.2);
      this.tubeStage.curve = makeTubeCurve(drive);
      
      this.toneStackLow.gain.setTargetAtTime(params.eqLow, time, 0.1);
      this.toneStackMid.gain.setTargetAtTime(params.eqMid, time, 0.1);
      this.toneStackHigh.gain.setTargetAtTime(params.eqHigh, time, 0.1);
  }
}
