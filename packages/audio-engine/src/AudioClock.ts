/** Converts between beats and seconds based on tempo and time signature. */
export class AudioClock {
  bpm: number;
  numerator: number;
  denominator: number;

  constructor(bpm: number, numerator: number, denominator: number) {
    this.bpm = bpm;
    this.numerator = numerator;
    this.denominator = denominator;
  }

  /** Seconds per beat. */
  get secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  /** Convert a beat position to seconds. */
  beatsToSeconds(beats: number): number {
    return beats * this.secondsPerBeat;
  }

  /** Convert seconds to beat position. */
  secondsToBeats(seconds: number): number {
    return seconds / this.secondsPerBeat;
  }

  /** Returns { bar, beat } from a beat position (1-indexed). */
  beatsToBarBeat(beats: number): { bar: number; beat: number } {
    const bar = Math.floor(beats / this.numerator) + 1;
    const beat = (beats % this.numerator) + 1;
    return { bar, beat };
  }
}
