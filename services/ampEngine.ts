
import { EffectParams } from '../types';
import { CleanAmp } from './amps/CleanAmp';
import { CrunchAmp } from './amps/CrunchAmp';
import { ModernAmp } from './amps/ModernAmp';
import { BassAmp } from './amps/BassAmp';
import { CabinetSimulator } from './amps/CabinetSimulator';

export class AmpEngine {
  input: GainNode;
  output: GainNode;
  
  // Amps
  private cleanAmp: CleanAmp;
  private crunchAmp: CrunchAmp;
  private modernAmp: ModernAmp;
  private bassAmp: BassAmp;
  
  // Selectors
  private cleanGate: GainNode;
  private crunchGate: GainNode;
  private modernGate: GainNode;
  private bassGate: GainNode;

  // Cabinet
  public cabinet: CabinetSimulator;
  private ampOut: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // Instantiate Amps
    this.cleanAmp = new CleanAmp(ctx);
    this.crunchAmp = new CrunchAmp(ctx);
    this.modernAmp = new ModernAmp(ctx);
    this.bassAmp = new BassAmp(ctx);
    
    // Instantiate Gates
    this.cleanGate = ctx.createGain();
    this.crunchGate = ctx.createGain();
    this.modernGate = ctx.createGain();
    this.bassGate = ctx.createGain();

    this.ampOut = ctx.createGain();
    
    // Connect Input -> Amps -> Gates -> AmpOut
    
    // Clean Path
    this.input.connect(this.cleanAmp.input);
    this.cleanAmp.output.connect(this.cleanGate);
    this.cleanGate.connect(this.ampOut);
    
    // Crunch Path
    this.input.connect(this.crunchAmp.input);
    this.crunchAmp.output.connect(this.crunchGate);
    this.crunchGate.connect(this.ampOut);
    
    // Modern Path
    this.input.connect(this.modernAmp.input);
    this.modernAmp.output.connect(this.modernGate);
    this.modernGate.connect(this.ampOut);
    
    // Bass Path
    this.input.connect(this.bassAmp.input);
    this.bassAmp.output.connect(this.bassGate);
    this.bassGate.connect(this.ampOut);
    
    // Cabinet Stage
    this.cabinet = new CabinetSimulator(ctx);
    this.ampOut.connect(this.cabinet.input);
    this.cabinet.output.connect(this.output);
    
    // Default: Clean selected
    this.cleanGate.gain.value = 1;
    this.crunchGate.gain.value = 0;
    this.modernGate.gain.value = 0;
    this.bassGate.gain.value = 0;
  }

  update(params: EffectParams, time: number) {
      const model = params.ampModel || 'clean';
      
      // Update all amps params (so they are ready if switched to)
      this.cleanAmp.update(params, time);
      this.crunchAmp.update(params, time);
      this.modernAmp.update(params, time);
      this.bassAmp.update(params, time);
      
      // Switcher Logic (Crossfade for smoothness)
      const fadeTime = 0.05;
      
      this.cleanGate.gain.setTargetAtTime(model === 'clean' ? 1 : 0, time, fadeTime);
      this.crunchGate.gain.setTargetAtTime(model === 'crunch' ? 1 : 0, time, fadeTime);
      this.modernGate.gain.setTargetAtTime(model === 'modern' ? 1 : 0, time, fadeTime);
      this.bassGate.gain.setTargetAtTime(model === 'bass' ? 1 : 0, time, fadeTime);

      // Update Cabinet
      this.cabinet.update(params.cabinetModel || 'bypass');
  }
}
