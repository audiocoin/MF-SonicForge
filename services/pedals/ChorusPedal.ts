import { EffectParams } from '../../types';

export class ChorusPedal {
    input: GainNode;
    output: GainNode;
    private delayL: DelayNode;
    private delayR: DelayNode;
    private oscL: OscillatorNode;
    private oscR: OscillatorNode;
    private oscGainL: GainNode;
    private oscGainR: GainNode;
    private dry: GainNode;
    private wet: GainNode;

    constructor(ctx: BaseAudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();

        this.delayL = ctx.createDelay();
        this.delayR = ctx.createDelay();
        
        this.oscL = ctx.createOscillator();
        this.oscR = ctx.createOscillator();
        this.oscL.type = 'sine';
        this.oscR.type = 'triangle';
        
        this.oscGainL = ctx.createGain();
        this.oscGainR = ctx.createGain();

        // Modulate Delay Times
        this.oscL.connect(this.oscGainL).connect(this.delayL.delayTime);
        this.oscR.connect(this.oscGainR).connect(this.delayR.delayTime);
        this.oscL.start();
        this.oscR.start();

        // Dry Path
        this.input.connect(this.dry).connect(this.output);

        // Wet Path
        // We route input to both left and right delays to simulate stereo chorus from mono source
        this.input.connect(this.delayL);
        this.input.connect(this.delayR);
        
        const merger = ctx.createChannelMerger(2);
        this.delayL.connect(merger, 0, 0);
        this.delayR.connect(merger, 0, 1);
        
        merger.connect(this.wet).connect(this.output);
    }

    update(params: EffectParams, time: number) {
        if (params.enableChorus) {
            this.dry.gain.setTargetAtTime(0.5, time, 0.1);
            this.wet.gain.setTargetAtTime(0.5, time, 0.1);
            
            this.oscL.frequency.setTargetAtTime(params.chorusRate, time, 0.1);
            this.oscR.frequency.setTargetAtTime(params.chorusRate * 1.1, time, 0.1); 
            
            const depthVal = (params.chorusDepth / 100) * 0.003; 
            this.oscGainL.gain.setTargetAtTime(depthVal, time, 0.1);
            this.oscGainR.gain.setTargetAtTime(depthVal, time, 0.1);
            
            // Base delay
            this.delayL.delayTime.setTargetAtTime(0.015, time, 0.1);
            this.delayR.delayTime.setTargetAtTime(0.020, time, 0.1);
        } else {
            this.dry.gain.setTargetAtTime(1, time, 0.1);
            this.wet.gain.setTargetAtTime(0, time, 0.1);
        }
    }
}