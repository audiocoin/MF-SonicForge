
import { GoogleGenAI, Type } from "@google/genai";
import { EffectParams } from "../../types";

export class ToneModeler {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.API_KEY;
    if (key) {
        this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateRig(description: string): Promise<{ params: EffectParams, name: string, description: string } | null> {
    if (!this.ai) {
        console.error("Gemini API Key is missing.");
        return null;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Act as a professional Audio DSP Engineer and Guitar Tech. 
        Analyze this request: "${description}".
        
        Construct a virtual signal chain using the available modules to replicate this tone.
        
        AVAILABLE MODULES & PARAMETER RANGES:
        - Amps: 'clean' (Fender), 'crunch' (Marshall), 'modern' (Mesa), 'bass' (Ampeg).
        - Gain: 0.0 to 3.0 (1.0 is standard).
        - Distortion: 0 to 100.
        - EQ (Low/Mid/High): -20 to +20 dB.
        - Graphic EQ Bands: -12 to +12 dB.
        
        PEDALS:
        - Compressor: Threshold (-60 to 0 dB), Ratio (1 to 20).
        - Supernova (Fuzz): Drive/Tone (0-100), Level (0.0-1.0).
        - Overdrive (Tube Screamer): Drive/Tone (0-100), Level (0.0-1.0).
        - Chorus: Rate (0.1-5 Hz), Depth (0-100).
        - Tremolo: Rate (0.5-10 Hz), Depth (0-100).
        - Delay: Time (0.0-1.0s), Feedback (0.0-0.9).
        - Reverb: Mix (0.0-1.0), Decay (0.1-10.0s).

        RULES:
        1. Select the closest 'ampModel' ID.
        2. Set parameters within the strictly defined ranges above.
        3. Enable specific pedals if characteristic of the sound (e.g., Chorus for 80s, Fuzz for Hendrix).
        4. Return a valid JSON object matching the schema.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "A creative short name for this preset" },
              description: { type: Type.STRING, description: "Brief explanation of the signal chain choices" },
              params: {
                type: Type.OBJECT,
                properties: {
                  ampModel: { type: Type.STRING, enum: ["clean", "crunch", "modern", "bass"] },
                  cabinetModel: { type: Type.STRING, enum: ["bypass", "modern-4x12", "vintage-1x12"] },
                  gain: { type: Type.NUMBER },
                  distortion: { type: Type.NUMBER },
                  eqLow: { type: Type.NUMBER },
                  eqMid: { type: Type.NUMBER },
                  eqHigh: { type: Type.NUMBER },
                  eq63: { type: Type.NUMBER },
                  eq125: { type: Type.NUMBER },
                  eq250: { type: Type.NUMBER },
                  eq500: { type: Type.NUMBER },
                  eq1k: { type: Type.NUMBER },
                  eq2k: { type: Type.NUMBER },
                  eq4k: { type: Type.NUMBER },
                  eq8k: { type: Type.NUMBER },
                  eq16k: { type: Type.NUMBER },
                  enableCompressor: { type: Type.BOOLEAN },
                  enableSupernova: { type: Type.BOOLEAN },
                  enableOverdrive: { type: Type.BOOLEAN },
                  enableChorus: { type: Type.BOOLEAN },
                  enableTremolo: { type: Type.BOOLEAN },
                  enableDelay: { type: Type.BOOLEAN },
                  enableReverb: { type: Type.BOOLEAN },
                  compressorThreshold: { type: Type.NUMBER },
                  compressorRatio: { type: Type.NUMBER },
                  supernovaDrive: { type: Type.NUMBER },
                  supernovaTone: { type: Type.NUMBER },
                  supernovaLevel: { type: Type.NUMBER },
                  overdriveDrive: { type: Type.NUMBER },
                  overdriveTone: { type: Type.NUMBER },
                  overdriveLevel: { type: Type.NUMBER },
                  chorusRate: { type: Type.NUMBER },
                  chorusDepth: { type: Type.NUMBER },
                  tremoloRate: { type: Type.NUMBER },
                  tremoloDepth: { type: Type.NUMBER },
                  reverbMix: { type: Type.NUMBER },
                  reverbDecay: { type: Type.NUMBER },
                  delayTime: { type: Type.NUMBER },
                  delayFeedback: { type: Type.NUMBER }
                },
                required: ["ampModel", "cabinetModel", "gain", "distortion", "eqLow", "eqMid", "eqHigh", "enableReverb", "enableDelay", "enableOverdrive"]
              }
            },
            required: ["name", "description", "params"]
          }
        }
      });

      const rawData = JSON.parse(response.text);
      
      // Sanitize and Clamp values to ensure they fit UI sliders
      if (rawData && rawData.params) {
          rawData.params = this.sanitizeParams(rawData.params);
      }

      return rawData;
    } catch (error) {
      console.error("Tone Modeling Error:", error);
      return null;
    }
  }

  private sanitizeParams(p: EffectParams): EffectParams {
      const clamp = (val: number | undefined, min: number, max: number, def: number) => 
          val === undefined ? def : Math.min(max, Math.max(min, val));

      return {
          ...p,
          gain: clamp(p.gain, 0, 3, 1.0),
          distortion: clamp(p.distortion, 0, 100, 0),
          
          // Amp EQ (-20 to 20)
          eqLow: clamp(p.eqLow, -20, 20, 0),
          eqMid: clamp(p.eqMid, -20, 20, 0),
          eqHigh: clamp(p.eqHigh, -20, 20, 0),

          // Graphic EQ (-12 to 12)
          eq63: clamp(p.eq63, -12, 12, 0),
          eq125: clamp(p.eq125, -12, 12, 0),
          eq250: clamp(p.eq250, -12, 12, 0),
          eq500: clamp(p.eq500, -12, 12, 0),
          eq1k: clamp(p.eq1k, -12, 12, 0),
          eq2k: clamp(p.eq2k, -12, 12, 0),
          eq4k: clamp(p.eq4k, -12, 12, 0),
          eq8k: clamp(p.eq8k, -12, 12, 0),
          eq16k: clamp(p.eq16k, -12, 12, 0),

          // Compressor
          compressorThreshold: clamp(p.compressorThreshold, -60, 0, -24),
          compressorRatio: clamp(p.compressorRatio, 1, 20, 4),

          // Pedals (0-100 or 0-1 ranges)
          supernovaDrive: clamp(p.supernovaDrive, 0, 100, 50),
          supernovaTone: clamp(p.supernovaTone, 0, 100, 50),
          supernovaLevel: clamp(p.supernovaLevel, 0, 1, 0.8),

          overdriveDrive: clamp(p.overdriveDrive, 0, 100, 50),
          overdriveTone: clamp(p.overdriveTone, 0, 100, 50),
          overdriveLevel: clamp(p.overdriveLevel, 0, 1, 1.0),

          chorusRate: clamp(p.chorusRate, 0.1, 5, 1.5),
          chorusDepth: clamp(p.chorusDepth, 0, 100, 30),

          tremoloRate: clamp(p.tremoloRate, 0.5, 10, 4),
          tremoloDepth: clamp(p.tremoloDepth, 0, 100, 50),

          reverbMix: clamp(p.reverbMix, 0, 1, 0.2),
          reverbDecay: clamp(p.reverbDecay, 0.1, 10, 1.5),

          delayTime: clamp(p.delayTime, 0, 1, 0.3),
          delayFeedback: clamp(p.delayFeedback, 0, 0.9, 0.3),
      };
  }
}
