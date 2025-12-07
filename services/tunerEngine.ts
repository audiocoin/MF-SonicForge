
export const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export class TunerEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private buffer: Float32Array = new Float32Array(0);
  private referenceA4: number = 440;

  constructor(config?: any) {}

  async init(): Promise<void> {
    if (this.audioContext?.state === 'running') return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.mediaStreamSource.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
  }

  setReferencePitch(hz: number) {
    this.referenceA4 = hz;
  }

  getPitch(): { note: string; cents: number; frequency: number; octave: number } | null {
    if (!this.analyser || !this.audioContext) return null;
    this.analyser.getFloatTimeDomainData(this.buffer);

    const freq = this.autoCorrelate(this.buffer, this.audioContext.sampleRate);
    if (freq === -1) return null;

    const noteNum = this.noteFromPitch(freq);
    const noteName = NOTE_STRINGS[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    const cents = this.centsOffFromPitch(freq, noteNum);
    
    return { note: noteName, cents, frequency: freq, octave };
  }

  private autoCorrelate(buf: Float32Array, sampleRate: number): number {
    const SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; 

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const buf2 = buf.slice(r1, r2);
    const c = new Array(buf2.length).fill(0);
    for (let i = 0; i < buf2.length; i++) {
      for (let j = 0; j < buf2.length - i; j++) {
        c[i] = c[i] + buf2[j] * buf2[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < buf2.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Parabolic interpolation
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  private noteFromPitch(frequency: number): number {
    const noteNum = 12 * (Math.log(frequency / this.referenceA4) / Math.log(2));
    return Math.round(noteNum) + 69;
  }

  private centsOffFromPitch(frequency: number, note: number): number {
    return Math.floor(1200 * Math.log(frequency / this.frequencyFromNoteNumber(note)) / Math.log(2));
  }

  private frequencyFromNoteNumber(note: number): number {
    return this.referenceA4 * Math.pow(2, (note - 69) / 12);
  }

  close() {
    this.audioContext?.close();
  }
}
