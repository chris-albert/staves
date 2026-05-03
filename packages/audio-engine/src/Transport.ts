import type { TempoMap } from './TempoMap';
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

export interface ScheduledDrumHit {
  /** Absolute beat position on the timeline. */
  beat: number;
  /** Sample key (URL) for DrumSampler lookup. */
  sampleKey: string;
  /** Velocity 0-1. */
  velocity: number;
}

export interface ScheduledDrumClip {
  clipId: string;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  /** Pre-expanded list of all hits positioned in absolute timeline beats. */
  hits: ScheduledDrumHit[];
}

export interface ScheduleWindow {
  clips: ScheduledClip[];
  drumClips: ScheduledDrumClip[];
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
 *
 * Uses TempoMap for non-linear beat↔seconds conversion so that tempo
 * ramps and time-signature changes are handled correctly.
 */
export class Transport {
  private context: AudioContext;
  private tempoMap: TempoMap;
  private metronome: Metronome | null;
  private state: TransportState = 'stopped';
  private startContextTime = 0;
  private startBeatOffset = 0;
  private _playOrigin = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private clipScheduler: ClipScheduler | null = null;
  private clips: ScheduledClip[] = [];
  private drumClips: ScheduledDrumClip[] = [];

  // Look-ahead config
  private readonly scheduleAheadTime = 0.1; // seconds
  private readonly timerInterval = 25; // ms
  private nextScheduleTime = 0;
  private lastScheduledMetronomeBeat = -1;

  // Loop
  private _loopStart = 0;
  private _loopEnd = 0;
  private _loopEnabled = false;

  constructor(context: AudioContext, tempoMap: TempoMap, metronome?: Metronome) {
    this.context = context;
    this.tempoMap = tempoMap;
    this.metronome = metronome ?? null;
  }

  setTempoMap(tempoMap: TempoMap): void {
    this.tempoMap = tempoMap;
  }

  get currentBeat(): number {
    if (this.state === 'stopped') return this.startBeatOffset;
    const elapsed = this.context.currentTime - this.startContextTime;
    const startSeconds = this.tempoMap.beatsToSeconds(this.startBeatOffset);
    return this.tempoMap.secondsToBeats(startSeconds + elapsed);
  }

  /** The beat position where playback was initiated from. */
  get playOrigin(): number {
    return this._playOrigin;
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

  setDrumClips(clips: ScheduledDrumClip[]): void {
    this.drumClips = clips;
  }

  play(): void {
    if (this.state !== 'stopped') return;
    this._playOrigin = this.startBeatOffset;
    this.state = 'playing';
    this.startContextTime = this.context.currentTime;
    this.nextScheduleTime = this.context.currentTime;
    this.lastScheduledMetronomeBeat = this.startBeatOffset - 1;
    this.scheduleLoop();
  }

  record(): void {
    if (this.state !== 'stopped') return;
    this._playOrigin = this.startBeatOffset;
    this.state = 'recording';
    this.startContextTime = this.context.currentTime;
    this.nextScheduleTime = this.context.currentTime;
    this.lastScheduledMetronomeBeat = this.startBeatOffset - 1;
    this.scheduleLoop();
  }

  stop(): void {
    if (this.state === 'stopped') return;
    // Return to where playback started, not where it ended
    this.startBeatOffset = this._playOrigin;
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
    this._playOrigin = this.startBeatOffset;
    if (wasPlaying) {
      this.play();
    }
  }

  private scheduleLoop(): void {
    const startCtx = this.startContextTime;
    const startSeconds = this.tempoMap.beatsToSeconds(this.startBeatOffset);

    while (this.nextScheduleTime < this.context.currentTime + this.scheduleAheadTime) {
      const windowElapsed = this.nextScheduleTime - startCtx;
      const windowEndElapsed = windowElapsed + this.scheduleAheadTime;

      const windowStartBeat = this.tempoMap.secondsToBeats(startSeconds + windowElapsed);
      const windowEndBeat = this.tempoMap.secondsToBeats(startSeconds + windowEndElapsed);

      // Convert beat → AudioContext time
      const beatToCtxTime = (beat: number) => {
        const beatSec = this.tempoMap.beatsToSeconds(beat);
        return startCtx + (beatSec - startSeconds);
      };

      // Schedule clips
      if (this.clipScheduler) {
        this.clipScheduler({
          clips: this.clips,
          drumClips: this.drumClips,
          fromBeat: windowStartBeat,
          toBeat: windowEndBeat,
          beatToContextTime: beatToCtxTime,
          context: this.context,
        });
      }

      // Schedule metronome clicks (denominator-aware: clicks on each beat unit)
      if (this.metronome) {
        const clickLines = this.tempoMap.getBeatLines(
          Math.max(0, windowStartBeat),
          windowEndBeat,
        );
        for (const line of clickLines) {
          if (line.beat > this.lastScheduledMetronomeBeat) {
            const beatTime = beatToCtxTime(line.beat);
            this.metronome.scheduleClick(beatTime, line.isDownbeat);
            this.lastScheduledMetronomeBeat = line.beat;
          }
        }
      }

      this.nextScheduleTime += this.scheduleAheadTime;
    }

    this.timerId = setTimeout(() => this.scheduleLoop(), this.timerInterval);
  }
}
