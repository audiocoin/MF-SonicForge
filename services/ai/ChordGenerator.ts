import { GoogleGenAI, Type } from "@google/genai";
import { ChordDiagram } from "../../types";

export class ChordGenerator {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.API_KEY;
    if (key) {
        this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  async getDiagram(instrument: string, root: string, quality: string): Promise<ChordDiagram | null> {
    if (!this.ai) {
        console.error("Gemini API Key is missing.");
        return null;
    }
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a valid chord diagram for ${root} ${quality} on ${instrument}.`,
        config: {
          systemInstruction: "Return a JSON object describing the fret positions. For 'frets', use -1 for muted strings, 0 for open strings, and >0 for fretted. 'fingers' uses 0 for open/mute, 1-4 for index-pinky. baseFret is the starting fret number.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              instrument: { type: Type.STRING },
              chordName: { type: Type.STRING },
              frets: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              fingers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              baseFret: { type: Type.INTEGER }
            },
            required: ["instrument", "chordName", "frets", "fingers", "baseFret"]
          }
        }
      });
      return JSON.parse(response.text) as ChordDiagram;
    } catch (error) {
      console.error("Chord Gen Error:", error);
      return null;
    }
  }
}