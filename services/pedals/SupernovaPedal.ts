import { EffectParams } from '../../types';
import { makeFuzzCurve } from '../audioUtils';

export class SupernovaPedal {
    input: GainNode;
    output: GainNode;
    private drive: WaveShaperNode;
    private tone: BiquadFilterNode;
    private level: GainNode;
    private dry: GainNode;
    private wet: GainNode;

    constructor(ctx: BaseAudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        
        this.dry = ctx.createGain();
        this.wet = ctx.createGain();
        this.level = ctx.createGain();
        
        this.drive = ctx.createWaveShaper();
        this.drive.oversample = '4x';
        
        this.tone = ctx.createBiquadFilter();
        this.tone.type = 'lowpass';

        // Path 1: Dry
        this.input.connect(this.dry).connect(this.output);

        // Path 2: Wet (Drive -> Tone -> Level)
        this.input.connect(this.drive)
            .connect(this.tone)
            .connect(this.level)
            .connect(this.wet)
            .connect(this.output);
    }

    update(params: EffectParams, time: number) {
        if (params.enableSupernova) {
            this.dry.gain.setTargetAtTime(0, time, 0.05);
            this.wet.gain.setTargetAtTime(1, time, 0.05);
            
            this.drive.curve = makeFuzzCurve(params.supernovaDrive);
            
            const freq = 400 + (params.supernovaTone / 100) * 8000;
            this.tone.frequency.setTargetAtTime(freq, time, 0.1);
            
            this.level.gain.setTargetAtTime(params.supernovaLevel, time, 0.1);
        } else {
            this.dry.gain.setTargetAtTime(1, time, 0.05);
            this.wet.gain.setTargetAtTime(0, time, 0.05);
        }
    }
}