
import { GoogleGenAI, Type } from "@google/genai";
import { DetectedSong } from "../../types";

export class SongDetector {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async detect(base64Audio: string): Promise<DetectedSong | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: "audio/wav", data: base64Audio } },
            { text: "Identify this song. Return JSON with title, artist, chords used, and confidence level." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              chords: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.STRING }
            },
            required: ["title", "artist", "chords", "confidence"]
          }
        }
      });
      return JSON.parse(response.text) as DetectedSong;
    } catch (error) {
      console.error("Song Detect Error:", error);
      return null;
    }
  }
}
