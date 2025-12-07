import { EffectParams } from '../../types';

export class TremoloPedal {
    input: GainNode;
    output: GainNode;
    private gain: GainNode;
    private osc: OscillatorNode;
    private oscGain: GainNode;

    constructor(ctx: BaseAudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        
        this.gain = ctx.createGain();
        this.osc = ctx.createOscillator();
        this.osc.type = 'sine';
        this.oscGain = ctx.createGain();

        // LFO modulates the gain
        this.osc.connect(this.oscGain).connect(this.gain.gain);
        this.osc.start();

        this.input.connect(this.gain).connect(this.output);
    }

    update(params: EffectParams, time: number) {
        if (params.enableTremolo) {
            this.osc.frequency.setTargetAtTime(params.tremoloRate, time, 0.1);
            const depth = params.tremoloDepth / 100;
            // Center the modulation around 1 - depth/2
            this.gain.gain.setTargetAtTime(1 - (depth/2), time, 0.1); 
            this.oscGain.gain.setTargetAtTime(depth/2, time, 0.1); 
        } else {
            this.gain.gain.setTargetAtTime(1, time, 0.1);
            this.oscGain.gain.setTargetAtTime(0, time, 0.1);
        }
    }
}