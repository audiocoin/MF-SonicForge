import { EffectParams } from '../../types';

export class CompressorPedal {
    input: GainNode;
    output: GainNode;
    compressor: DynamicsCompressorNode;

    constructor(ctx: BaseAudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        this.input.connect(this.compressor);
        this.compressor.connect(this.output);
    }

    update(params: EffectParams, time: number) {
        if (params.enableCompressor) {
            this.compressor.threshold.setTargetAtTime(params.compressorThreshold, time, 0.1);
            this.compressor.ratio.setTargetAtTime(params.compressorRatio, time, 0.1);
        } else {
            this.compressor.threshold.setTargetAtTime(0, time, 0.1);
            this.compressor.ratio.setTargetAtTime(1, time, 0.1);
        }
    }
}