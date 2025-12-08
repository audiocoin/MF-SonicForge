
export enum AppMode {
  TUNER = 'TUNER',
  EFFECTS = 'EFFECTS',
  AI_TOOLS = 'AI_TOOLS',
  DRUM_MACHINE = 'DRUM_MACHINE',
  CHORD_LIBRARY = 'CHORD_LIBRARY',
  VOICE_STUDIO = 'VOICE_STUDIO',
  ACADEMY = 'ACADEMY'
}

export interface Note {
  name: string;
  frequency: number;
  octave: number;
}

export interface InstrumentString {
  note: string;
  octave: number;
  frequency: number;
}

export interface InstrumentConfig {
  name: string;
  strings: InstrumentString[];
}

export interface EffectParams {
  // Amp Model Selection
  ampModel?: string;

  // Cabinet Model
  cabinetModel: string; // 'bypass', 'modern-4x12', 'vintage-1x12', 'custom'

  // Pre-Amp / Drive
  gain: number;
  distortion: number;
  
  // Amp EQ (3-Band)
  eqHigh: number;
  eqMid: number;
  eqLow: number;

  // 9-Band Graphic EQ
  eq63: number;
  eq125: number;
  eq250: number;
  eq500: number;
  eq1k: number;
  eq2k: number;
  eq4k: number;
  eq8k: number;
  eq16k: number;
  
  // Stompbox Enables
  enableCompressor: boolean;
  enableSupernova: boolean; // Purple Fuzz
  enableOverdrive: boolean; // Green Drive
  enableChorus: boolean;
  enableTremolo: boolean;
  enableDelay: boolean;
  enableReverb: boolean;

  // Dynamics
  compressorThreshold: number; // -100 to 0 dB
  compressorRatio: number; // 1 to 20
  
  // Supernova (Zoeldrive)
  supernovaDrive: number; // 0 to 100
  supernovaTone: number; // 0 to 100
  supernovaLevel: number; // 0 to 1

  // Green Drive (Tube Screamer style)
  overdriveDrive: number;
  overdriveTone: number;
  overdriveLevel: number;

  // Modulation
  chorusRate: number;
  chorusDepth: number;
  
  // Tremolo
  tremoloRate: number;
  tremoloDepth: number;

  // Time-Based
  reverbMix: number; // 0 to 1
  reverbDecay: number; // 0.1 to 10s
  delayTime: number;
  delayFeedback: number;
}

export type TabTechnique = 
  | 'normal' 
  | 'hammer' 
  | 'pull' 
  | 'slide' 
  | 'bend' 
  | 'vibrato' 
  | 'palmMute' 
  | 'harmonic' 
  | 'dead';

export interface PlayableTabNote {
  string: number; // 1-6 (or more for other instruments)
  fret: number;
  beat: number; // Beat position (e.g., 1.0, 1.5)
  duration: number; // In beats
  technique?: TabTechnique; 
  bendAmount?: number; // In semitones (e.g., 1 for half step, 2 for full)
  slideTo?: number; // Target fret for slide
}

export interface TabResult {
  song: string;
  artist: string;
  bpm: number;
  tabs: string;
  playableData: PlayableTabNote[];
  
  // New Theory & Metadata Fields
  key?: string;
  scale?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  tuning?: string[]; // Array of note names e.g. ["D2", "A2", "D3"...]
  tuningName?: string; // e.g. "Drop D"
  performanceNotes?: string; // AI Coach tips
}

export interface DetectedSong {
  title: string;
  artist: string;
  chords: string[];
  confidence: string;
}

export interface ChordDiagram {
  instrument: string;
  chordName: string;
  frets: number[]; // Array of fret numbers (e.g., [x, 3, 2, 0, 1, 0] where -1 is mute)
  fingers: number[]; // Array of finger numbers (0=none, 1=index, etc.)
  baseFret: number;
}

export interface VideoLesson {
  id: string; // YouTube Video ID
  title: string;
  channel?: string;
  url: string;
  thumbnailUrl: string;
}

export interface AudioTake {
  id: string;
  blob: Blob;
  name: string;
  date: Date;
  duration: number;
}

export interface JamBlueprint {
  key: string;
  tempo: number;
  styleDescription: string;
  chordProgression: string[];
}
    
export type TabInstrumentType = 'acoustic' | 'clean' | 'distorted';
