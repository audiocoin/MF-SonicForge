import { EffectParams } from '../types';
import { CompressorPedal } from './pedals/CompressorPedal';
import { SupernovaPedal } from './pedals/SupernovaPedal';
import { OverdrivePedal } from './pedals/OverdrivePedal';
import { TremoloPedal } from './pedals/TremoloPedal';
import { ChorusPedal } from './pedals/ChorusPedal';
import { DelayPedal } from './pedals/DelayPedal';
import { ReverbPedal } from './pedals/ReverbPedal';

export class PedalEngine {
    inputPre: GainNode;
    outputPre: GainNode;
    inputPost: GainNode;
    outputPost: GainNode;

    // Pedals
    compressor: CompressorPedal;
    supernova: SupernovaPedal;
    overdrive: OverdrivePedal;
    
    tremolo: TremoloPedal;
    chorus: ChorusPedal;
    delay: DelayPedal;
    reverb: ReverbPedal;

    constructor(ctx: BaseAudioContext) {
        // --- PRE CHAIN ---
        this.inputPre = ctx.createGain();
        this.outputPre = ctx.createGain();

        this.compressor = new CompressorPedal(ctx);
        this.supernova = new SupernovaPedal(ctx);
        this.overdrive = new OverdrivePedal(ctx);

        // Chain: Input -> Comp -> Supernova -> Overdrive -> OutputPre
        this.inputPre.connect(this.compressor.input);
        this.compressor.output.connect(this.supernova.input);
        this.supernova.output.connect(this.overdrive.input);
        this.overdrive.output.connect(this.outputPre);

        // --- POST CHAIN ---
        this.inputPost = ctx.createGain();
        this.outputPost = ctx.createGain();

        this.tremolo = new TremoloPedal(ctx);
        this.chorus = new ChorusPedal(ctx);
        this.delay = new DelayPedal(ctx);
        this.reverb = new ReverbPedal(ctx);

        // Chain: InputPost -> Tremolo -> Chorus -> Delay -> Reverb -> OutputPost
        this.inputPost.connect(this.tremolo.input);
        this.tremolo.output.connect(this.chorus.input);
        this.chorus.output.connect(this.delay.input);
        this.delay.output.connect(this.reverb.input);
        this.reverb.output.connect(this.outputPost);
    }

    update(params: EffectParams, time: number, ctx: BaseAudioContext) {
        this.compressor.update(params, time);
        this.supernova.update(params, time);
        this.overdrive.update(params, time);
        
        this.tremolo.update(params, time);
        this.chorus.update(params, time);
        this.delay.update(params, time);
        this.reverb.update(params, time, ctx);
    }
}