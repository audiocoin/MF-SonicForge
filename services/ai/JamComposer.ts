import { GoogleGenAI, Type, Modality } from "@google/genai";
import { JamBlueprint } from "../../types";

export class JamComposer {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.API_KEY;
    if (key) {
        this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateBlueprint(prompt: string): Promise<JamBlueprint | null> {
    if (!this.ai) {
        console.error("Gemini API Key is missing.");
        return null;
    }
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a musical backing track blueprint for: "${prompt}".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING },
              tempo: { type: Type.INTEGER },
              styleDescription: { type: Type.STRING, description: "A creative description of the style/vibe" },
              chordProgression: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["key", "tempo", "styleDescription", "chordProgression"]
          }
        }
      });
      return JSON.parse(response.text) as JamBlueprint;
    } catch (error) {
      console.error("Jam Blueprint Gen Error:", error);
      return null;
    }
  }

  async generateInstrumentLoop(style: string, tempo: number, instrument: string): Promise<string | null> {
    if (!this.ai) return null;
    try {
      const prompt = instrument === 'drums' 
        ? `(Beatbox rhythm for ${style} at ${tempo} bpm). Boots cats boots cats.` 
        : `(Vocal bassline for ${style} at ${tempo} bpm). Dum dum dum dum.`;
        
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: prompt }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: instrument === 'drums' ? 'Fenrir' : 'Kore' }
            }
          }
        }
      });
      
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
      console.error("Instrument Loop Gen Error:", error);
      return null;
    }
  }
}