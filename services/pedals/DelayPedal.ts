import { EffectParams } from '../../types';

export class DelayPedal {
    input: GainNode;
    output: GainNode;
    private delay: DelayNode;
    private feedback: GainNode;
    private filter: BiquadFilterNode;
    private wet: GainNode;
    private dry: GainNode;

    constructor(ctx: BaseAudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        
        this.delay = ctx.createDelay(2.0); // Max delay
        this.feedback = ctx.createGain();
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2500; // Analog delay warmth

        // Feedback Loop
        this.delay.connect(this.filter).connect(this.feedback).connect(this.delay);

        // Routing
        this.input.connect(this.dry).connect(this.output);
        this.input.connect(this.delay).connect(this.wet).connect(this.output);
    }

    update(params: EffectParams, time: number) {
        if (params.enableDelay) {
            this.delay.delayTime.setTargetAtTime(params.delayTime, time, 0.1);
            this.feedback.gain.setTargetAtTime(params.delayFeedback, time, 0.1);
            this.wet.gain.setTargetAtTime(0.5, time, 0.1);
            this.dry.gain.setTargetAtTime(1.0, time, 0.1);
        } else {
            this.wet.gain.setTargetAtTime(0, time, 0.1);
            this.feedback.gain.setTargetAtTime(0, time, 0.1);
        }
    }
}