import { EffectParams } from '../../types';
import { makeTubeCurve } from '../audioUtils';

export class OverdrivePedal {
    input: GainNode;
    output: GainNode;
    private hpf: BiquadFilterNode;
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

        this.hpf = ctx.createBiquadFilter();
        this.hpf.type = 'highpass';
        this.hpf.frequency.value = 720; // Tube screamer characteristic

        this.drive = ctx.createWaveShaper();
        this.drive.oversample = '4x';

        this.tone = ctx.createBiquadFilter();
        this.tone.type = 'lowpass';

        // Dry Path
        this.input.connect(this.dry).connect(this.output);

        // Wet Path
        this.input.connect(this.hpf)
            .connect(this.drive)
            .connect(this.tone)
            .connect(this.level)
            .connect(this.wet)
            .connect(this.output);
    }

    update(params: EffectParams, time: number) {
        if (params.enableOverdrive) {
            this.dry.gain.setTargetAtTime(0, time, 0.05);
            this.wet.gain.setTargetAtTime(1, time, 0.05);

            this.drive.curve = makeTubeCurve(params.overdriveDrive);
            
            const freq = 800 + (params.overdriveTone / 100) * 5000;
            this.tone.frequency.setTargetAtTime(freq, time, 0.1);
            
            this.level.gain.setTargetAtTime(params.overdriveLevel, time, 0.1);
        } else {
            this.dry.gain.setTargetAtTime(1, time, 0.05);
            this.wet.gain.setTargetAtTime(0, time, 0.05);
        }
    }
}