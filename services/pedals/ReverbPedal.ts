import { EffectParams } from '../../types';

export class ReverbPedal {
    input: GainNode;
    output: GainNode;
    private convolver: ConvolverNode;
    private wet: GainNode;
    private dry: GainNode;
    private currentDecay: number = 0;

    constructor(ctx: BaseAudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        
        this.convolver = ctx.createConvolver();

        // Routing
        this.input.connect(this.dry).connect(this.output);
        this.input.connect(this.convolver).connect(this.wet).connect(this.output);
    }

    update(params: EffectParams, time: number, ctx: BaseAudioContext) {
        if (params.enableReverb) {
            this.updateBuffer(params.reverbDecay, ctx);
            this.wet.gain.setTargetAtTime(params.reverbMix, time, 0.1);
            this.dry.gain.setTargetAtTime(1.0, time, 0.1);
        } else {
            this.wet.gain.setTargetAtTime(0, time, 0.1);
        }
    }

    private updateBuffer(decayTime: number, ctx: BaseAudioContext) {
        if (Math.abs(this.currentDecay - decayTime) < 0.1 && this.convolver.buffer) return;
        this.currentDecay = decayTime;
        
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * decayTime;
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 2.5); 
            // Simple noise burst for reverb impulse
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        this.convolver.buffer = impulse;
    }
}