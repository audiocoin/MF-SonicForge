
export class MetronomeEngine {
  audioContext: AudioContext | null = null;
  isPlaying: boolean = false;
  tempo: number = 120;
  nextNoteTime: number = 0;
  timerID: number | undefined;
  lookahead: number = 25.0; // ms
  scheduleAheadTime: number = 0.1; // s
  currentBeat: number = 0;
  beatsPerBar: number = 4;
  onBeat: (beat: number) => void;

  constructor(onBeat: (beat: number) => void) {
    this.onBeat = onBeat;
  }

  setTempo(bpm: number) { 
      this.tempo = bpm; 
  }

  start() {
    if (this.isPlaying) return;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') this.audioContext.resume();
    
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    window.clearTimeout(this.timerID);
  }

  private scheduler() {
    // While there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    while (this.nextNoteTime < this.audioContext!.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.next();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private next() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
  }

  private scheduleNote(beatNumber: number, time: number) {
    // Visual callback sync
    setTimeout(() => {
        if(this.isPlaying) this.onBeat(beatNumber);
    }, (time - this.audioContext!.currentTime) * 1000);

    // Audio Click
    const osc = this.audioContext!.createOscillator();
    const envelope = this.audioContext!.createGain();

    osc.connect(envelope);
    envelope.connect(this.audioContext!.destination);

    if (beatNumber === 0) {
      osc.frequency.value = 1000; // High pitch for downbeat
    } else {
      osc.frequency.value = 800;  // Lower pitch for other beats
    }

    envelope.gain.value = 1;
    envelope.gain.setValueAtTime(1, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  }
}
