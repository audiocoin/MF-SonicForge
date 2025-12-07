import { GoogleGenAI, Type } from "@google/genai";
import { TabResult } from "../../types";

export interface TranscriptionOptions {
  instrument: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export class TranscriptionAgent {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const key = process.env.API_KEY;
    if (key) {
        this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateTabFromQuery(query: string, options: TranscriptionOptions = { instrument: 'Guitar', difficulty: 'Intermediate' }): Promise<TabResult | null> {
    if (!this.ai) {
        console.error("Gemini API Key is missing.");
        return null;
    }
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Create accurate ${options.difficulty} level ${options.instrument} tablature for: "${query}". 
        
        Analyze the track deeply:
        1. Determine the Key and Scale.
        2. Identify the Tuning required.
        3. Create performance notes/tips for the player.
        4. Generate the playable tab data.`,
        config: {
          systemInstruction: this.getSystemInstruction(options),
          responseMimeType: "application/json",
          responseSchema: this.getSchema()
        }
      });
      
      const result = JSON.parse(response.text) as TabResult;
      return this.validateResult(result);
    } catch (error) {
      console.error("Tab Generation Error:", error);
      return null;
    }
  }

  async generateTabFromAudio(base64Audio: string, options: TranscriptionOptions = { instrument: 'Guitar', difficulty: 'Intermediate' }): Promise<TabResult | null> {
    if (!this.ai) {
        console.error("Gemini API Key is missing.");
        return null;
    }
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: {
            parts: [
                { inlineData: { mimeType: "audio/wav", data: base64Audio } },
                { text: `Listen to this audio recording. Transcribe the ${options.instrument} part into ${options.difficulty} level tablature. 
                Identify the song if possible, or name it 'Audio Transcription'. 
                Analyze the Key, BPM, and Playing Techniques used.` }
            ]
        },
        config: {
          systemInstruction: this.getSystemInstruction(options),
          responseMimeType: "application/json",
          responseSchema: this.getSchema()
        }
      });

      const result = JSON.parse(response.text) as TabResult;
      return this.validateResult(result);
    } catch (error) {
      console.error("Audio Transcription Error:", error);
      return null;
    }
  }

  private getSystemInstruction(options: TranscriptionOptions): string {
    return `You are a virtuoso music theorist and transcriber. Your job is to convert music into a rich JSON structure.
    
    Target Instrument: ${options.instrument}
    Target Difficulty: ${options.difficulty}
    
    ANALYSIS RULES:
    1. **Key & Scale**: Identify the harmonic context (e.g., "A Minor", "E Phrygian Dominant").
    2. **Tuning**: Specify the exact tuning string by string (e.g., ["D2", "A2", "D3", "G3", "B3", "E4"] for Drop D).
    3. **Performance Notes**: Provide 1-2 sentences of coaching advice specific to the techniques used (e.g., "Use wide vibrato on the long notes").
    
    TAB GENERATION RULES:
    1. 'tabs': A visual ASCII string representation.
    2. 'playableData': Precise array for synthesis.
    3. 'difficulty': Match the requested level. If 'Beginner', simplify fast runs or complex chords.
    
    PLAYABLE DATA SPECS:
    - 'string': 1 is highest pitch string, ${options.instrument === 'Bass' ? '4' : '6'} is lowest.
    - 'technique': Use specific articulations ('bend', 'slide', 'harmonic') where appropriate.
    - 'beat': Must be precise float values for rhythmic accuracy.
    `;
  }

  private getSchema(): any {
      return {
          type: Type.OBJECT,
          properties: {
            song: { type: Type.STRING },
            artist: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            key: { type: Type.STRING },
            scale: { type: Type.STRING },
            tuningName: { type: Type.STRING },
            tuning: { type: Type.ARRAY, items: { type: Type.STRING } },
            difficulty: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
            performanceNotes: { type: Type.STRING },
            tabs: { type: Type.STRING },
            playableData: { 
                type: Type.ARRAY, 
                items: {
                    type: Type.OBJECT,
                    properties: {
                        string: { type: Type.INTEGER },
                        fret: { type: Type.INTEGER },
                        beat: { type: Type.NUMBER },
                        duration: { type: Type.NUMBER },
                        technique: { type: Type.STRING, enum: ['normal', 'hammer', 'pull', 'slide', 'bend', 'vibrato', 'palmMute', 'harmonic', 'dead'] },
                        bendAmount: { type: Type.NUMBER },
                        slideTo: { type: Type.INTEGER }
                    },
                    required: ["string", "fret", "beat", "duration"]
                }
            }
          },
          required: ["song", "artist", "tabs", "playableData", "bpm", "key", "tuning"]
      };
  }

  private validateResult(result: TabResult): TabResult {
      if (!result.playableData) result.playableData = [];
      result.playableData.sort((a, b) => a.beat - b.beat);
      return result;
  }
}