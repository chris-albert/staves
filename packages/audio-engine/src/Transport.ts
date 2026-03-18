import type { AudioClock } from './AudioClock';
import type { Metronome } from './Metronome';

export type TransportState = 'stopped' | 'playing' | 'recording';

export interface ScheduledClip {
  clipId: string;
  trackId: string;
  buffer: AudioBuffer;
  startBeat: number;
  durationBeats: number;
  offsetBeats: number;
  gainDb: number;
}

export interface ScheduleWindow {
  clips: ScheduledClip[];
  fromBeat: number;
  toBeat: number;
  /** Converts a beat position to an absolute AudioContext time for scheduling. */
  beatToContextTime: (beat: number) => number;
  context: AudioContext;
}

type ClipScheduler = (window: ScheduleWindow) => void;

/**
 * Look-ahead scheduler based on Chris Wilson's "A Tale of Two Clocks".
 * Uses setTimeout (not rAF) so audio keeps playing in background tabs.
 */
export class Transport {
  private context: AudioContext;
  private clock: AudioClock;
  private metronome: Metronome | null;
  private state: TransportState = 'stopped';
  private startContextTime = 0;
  private startBeatOffset = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private clipScheduler: ClipScheduler | null = null;
  private clips: ScheduledClip[] = [];

  // Look-ahead config
  private readonly scheduleAheadTime = 0.1; // seconds
  private readonly timerInterval = 25; // ms
  private nextScheduleTime = 0;
  private lastScheduledMetronomeBeat = -1;

  // Loop
  private _loopStart = 0;
  private _loopEnd = 0;
  private _loopEnabled = false;

  constructor(context: AudioContext, clock: AudioClock, metronome?: Metronome) {
    this.context = context;
    this.clock = clock;
    this.metronome = metronome ?? null;
  }

  get currentBeat(): number {
    if (this.state === 'stopped') return this.startBeatOffset;
    const elapsed = this.context.currentTime - this.startContextTime;
    return this.startBeatOffset + this.clock.secondsToBeats(elapsed);
  }

  get isPlaying(): boolean {
    return this.state === 'playing' || this.state === 'recording';
  }

  get isRecording(): boolean {
    return this.state === 'recording';
  }

  get loopEnabled(): boolean {
    return this._loopEnabled;
  }

  set loopEnabled(v: boolean) {
    this._loopEnabled = v;
  }

  get loopStart(): number {
    return this._loopStart;
  }

  set loopStart(v: number) {
    this._loopStart = v;
  }

  get loopEnd(): number {
    return this._loopEnd;
  }

  set loopEnd(v: number) {
    this._loopEnd = v;
  }

  setClipScheduler(scheduler: ClipScheduler): void {
    this.clipScheduler = scheduler;
  }

  setClips(clips: ScheduledClip[]): void {
    this.clips = clips;
  }

  play(): void {
    if (this.state !== 'stopped') return;
    this.state = 'playing';
    this.startContextTime = this.context.currentTime;
    this.nextScheduleTime = this.context.currentTime;
    this.lastScheduledMetronomeBeat = Math.floor(this.startBeatOffset) - 1;
    this.scheduleLoop();
  }

  record(): void {
    if (this.state !== 'stopped') return;
    this.state = 'recording';
    this.startContextTime = this.context.currentTime;
    this.nextScheduleTime = this.context.currentTime;
    this.lastScheduledMetronomeBeat = Math.floor(this.startBeatOffset) - 1;
    this.scheduleLoop();
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.startBeatOffset = 0;
    this.state = 'stopped';
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  seek(beat: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.state = 'stopped';
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    }
    this.startBeatOffset = Math.max(0, beat);
    if (wasPlaying) {
      this.play();
    }
  }

  private scheduleLoop(): void {
    const startCtx = this.startContextTime;
    const offset = this.startBeatOffset;

    while (this.nextScheduleTime < this.context.currentTime + this.scheduleAheadTime) {
      const windowStartBeat = offset + this.clock.secondsToBeats(this.nextScheduleTime - startCtx);
      const windowEndBeat = offset + this.clock.secondsToBeats(this.nextScheduleTime + this.scheduleAheadTime - startCtx);

      // Schedule clips
      if (this.clipScheduler) {
        this.clipScheduler({
          clips: this.clips,
          fromBeat: windowStartBeat,
          toBeat: windowEndBeat,
          beatToContextTime: (beat: number) =>
            startCtx + this.clock.beatsToSeconds(beat - offset),
          context: this.context,
        });
      }

      // Schedule metronome clicks
      if (this.metronome) {
        for (let beat = Math.ceil(windowStartBeat); beat < windowEndBeat; beat++) {
          if (beat > this.lastScheduledMetronomeBeat && beat >= 0) {
            const beatTime = startCtx + this.clock.beatsToSeconds(beat - offset);
            const isDownbeat = beat % this.clock.numerator === 0;
            this.metronome.scheduleClick(beatTime, isDownbeat);
            this.lastScheduledMetronomeBeat = beat;
          }
        }
      }

      this.nextScheduleTime += this.scheduleAheadTime;
    }

    this.timerId = setTimeout(() => this.scheduleLoop(), this.timerInterval);
  }
}
