/**
 * Tempo and time-signature events with support for gradual ramps.
 *
 * The core challenge: with variable tempo the beat↔seconds relationship
 * is non-linear.  For a linear BPM ramp from T0→T1 over N beats the
 * closed-form integral gives:
 *
 *   time(b) = (60/α) · ln(T(b)/T0)      α = (T1-T0)/N
 *   beat(t) = b0 + (T0/α) · (e^(αt/60) - 1)
 *
 * For constant-tempo segments the familiar linear relationship holds.
 */

// ---------------------------------------------------------------------------
// Public data types
// ---------------------------------------------------------------------------

export interface TempoEvent {
  id: string;
  /** Beat position of the event on the global timeline. */
  beat: number;
  /** Tempo in beats-per-minute at this position. */
  bpm: number;
  /** How tempo transitions *to the next event*. 'linear' = gradual ramp. */
  curveType: 'constant' | 'linear';
}

export interface TimeSignatureEvent {
  id: string;
  /** Beat position (must lie on a bar boundary). */
  beat: number;
  numerator: number;
  denominator: number;
}

// ---------------------------------------------------------------------------
// Internal precomputed segments
// ---------------------------------------------------------------------------

interface TempoSegment {
  startBeat: number;
  endBeat: number;        // Infinity for last segment
  startBpm: number;
  endBpm: number;         // equals startBpm when constant
  startTime: number;      // cumulative seconds at startBeat
}

interface TimeSigSegment {
  startBeat: number;
  endBeat: number;        // Infinity for last segment
  numerator: number;
  denominator: number;
  /** Quarter-note beats per bar: numerator * (4 / denominator).
   *  e.g. 4/4 = 4, 5/8 = 2.5, 3/16 = 0.75 */
  beatsPerBar: number;
  startBar: number;       // 1-indexed bar number at startBeat
}

// ---------------------------------------------------------------------------
// TempoMap
// ---------------------------------------------------------------------------

export class TempoMap {
  private tempoEvents: TempoEvent[];
  private timeSigEvents: TimeSignatureEvent[];
  private tempoSegments: TempoSegment[] = [];
  private timeSigSegments: TimeSigSegment[] = [];

  constructor(
    tempoEvents?: TempoEvent[],
    timeSigEvents?: TimeSignatureEvent[],
  ) {
    this.tempoEvents = tempoEvents && tempoEvents.length > 0
      ? [...tempoEvents].sort((a, b) => a.beat - b.beat)
      : [{ id: '_default_tempo', beat: 0, bpm: 120, curveType: 'constant' as const }];

    this.timeSigEvents = timeSigEvents && timeSigEvents.length > 0
      ? [...timeSigEvents].sort((a, b) => a.beat - b.beat)
      : [{ id: '_default_ts', beat: 0, numerator: 4, denominator: 4 }];

    // Ensure beat-0 events exist
    const firstTempo = this.tempoEvents[0]!;
    if (firstTempo.beat !== 0) {
      this.tempoEvents.unshift({
        id: '_default_tempo',
        beat: 0,
        bpm: firstTempo.bpm,
        curveType: 'constant',
      });
    }
    const firstTimeSig = this.timeSigEvents[0]!;
    if (firstTimeSig.beat !== 0) {
      this.timeSigEvents.unshift({
        id: '_default_ts',
        beat: 0,
        numerator: firstTimeSig.numerator,
        denominator: firstTimeSig.denominator,
      });
    }

    this.rebuild();
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getTempoEvents(): readonly TempoEvent[] {
    return this.tempoEvents;
  }

  getTimeSignatureEvents(): readonly TimeSignatureEvent[] {
    return this.timeSigEvents;
  }

  // -----------------------------------------------------------------------
  // Core conversions
  // -----------------------------------------------------------------------

  /** Convert a beat position to absolute seconds. */
  beatsToSeconds(beat: number): number {
    if (beat <= 0) return 0;
    const seg = this.findTempoSegment(beat);
    return seg.startTime + this.segmentBeatsToSeconds(seg, beat);
  }

  /** Convert absolute seconds to a beat position. */
  secondsToBeats(seconds: number): number {
    if (seconds <= 0) return 0;
    const seg = this.findTempoSegmentByTime(seconds);
    return seg.startBeat + this.segmentSecondsToBeat(seg, seconds);
  }

  /** Interpolated BPM at a given beat position. */
  tempoAtBeat(beat: number): number {
    const seg = this.findTempoSegment(Math.max(0, beat));
    if (seg.startBpm === seg.endBpm) return seg.startBpm;
    const segLen = seg.endBeat - seg.startBeat;
    if (segLen === 0 || !isFinite(segLen)) return seg.startBpm;
    const t = (beat - seg.startBeat) / segLen;
    return seg.startBpm + (seg.endBpm - seg.startBpm) * t;
  }

  /** Time signature at a given beat position. */
  timeSignatureAtBeat(beat: number): { numerator: number; denominator: number } {
    const seg = this.findTimeSigSegment(Math.max(0, beat));
    return { numerator: seg.numerator, denominator: seg.denominator };
  }

  /** Convert a beat position to bar/beat/subBeat (all 1-indexed).
   *  "beat" in the result counts denominator-unit beats within the bar. */
  beatsToBarBeat(beat: number): { bar: number; beat: number; subBeat: number } {
    const seg = this.findTimeSigSegment(Math.max(0, beat));
    const beatsIntoSegment = beat - seg.startBeat;
    const barsIntoSegment = Math.floor(beatsIntoSegment / seg.beatsPerBar);
    // Position within the current bar in quarter-note beats
    const qnInBar = beatsIntoSegment - barsIntoSegment * seg.beatsPerBar;
    // Convert to denominator-unit beats (e.g. in 5/8, each unit = 0.5 quarter notes)
    const denomUnitSize = 4 / seg.denominator; // quarter-note size of one denominator unit
    const beatInBar = Math.floor(qnInBar / denomUnitSize) + 1;
    const fractionalBeat = (qnInBar / denomUnitSize) % 1;
    const subBeat = Math.floor(fractionalBeat * 4) + 1;
    return {
      bar: seg.startBar + barsIntoSegment,
      beat: beatInBar,
      subBeat,
    };
  }

  // -----------------------------------------------------------------------
  // Timeline helpers (for ruler / grid)
  // -----------------------------------------------------------------------

  /** Returns bar-line positions in a beat range. */
  getBarLines(
    startBeat: number,
    endBeat: number,
  ): { beat: number; bar: number; numerator: number }[] {
    const result: { beat: number; bar: number; numerator: number }[] = [];

    for (const seg of this.timeSigSegments) {
      if (seg.startBeat >= endBeat) break;
      const segEnd = Math.min(seg.endBeat, endBeat);
      const segStart = Math.max(seg.startBeat, startBeat);

      // First bar in this segment that's >= segStart
      const beatsFromSegStart = segStart - seg.startBeat;
      const firstBarIndex = Math.ceil(beatsFromSegStart / seg.beatsPerBar);
      for (let i = firstBarIndex; ; i++) {
        const barBeat = seg.startBeat + i * seg.beatsPerBar;
        if (barBeat >= segEnd) break;
        result.push({
          beat: barBeat,
          bar: seg.startBar + i,
          numerator: seg.numerator,
        });
      }
    }
    return result;
  }

  /** Returns beat-line positions in a beat range with downbeat flags.
   *  Beat positions are spaced at the denominator unit size
   *  (quarter notes for /4, eighth notes for /8, etc.). */
  getBeatLines(
    startBeat: number,
    endBeat: number,
  ): { beat: number; isDownbeat: boolean }[] {
    const result: { beat: number; isDownbeat: boolean }[] = [];

    for (const seg of this.timeSigSegments) {
      if (seg.startBeat >= endBeat) break;
      const segEnd = Math.min(seg.endBeat, endBeat);
      const denomUnitSize = 4 / seg.denominator; // quarter-note size of one beat unit

      // Find the first beat-line in this segment that's >= startBeat
      const beatsFromSegStart = Math.max(0, startBeat - seg.startBeat);
      const firstIndex = Math.ceil(beatsFromSegStart / denomUnitSize);
      for (let i = firstIndex; ; i++) {
        const beatPos = seg.startBeat + i * denomUnitSize;
        if (beatPos >= segEnd) break;
        // Round to avoid floating point issues
        const rounded = Math.round(beatPos * 1e10) / 1e10;
        const isDownbeat = Math.round((beatPos - seg.startBeat) * 1e10) % Math.round(seg.beatsPerBar * 1e10) === 0;
        result.push({ beat: rounded, isDownbeat });
      }
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Immutable mutations — return a new TempoMap
  // -----------------------------------------------------------------------

  addTempoEvent(event: TempoEvent): TempoMap {
    return new TempoMap([...this.tempoEvents, event], [...this.timeSigEvents]);
  }

  updateTempoEvent(id: string, changes: Partial<TempoEvent>): TempoMap {
    return new TempoMap(
      this.tempoEvents.map((e) => (e.id === id ? { ...e, ...changes } : e)),
      [...this.timeSigEvents],
    );
  }

  removeTempoEvent(id: string): TempoMap {
    const filtered = this.tempoEvents.filter((e) => e.id !== id);
    // Never remove the beat-0 event
    if (filtered.length === 0 || filtered[0]!.beat !== 0) {
      return this; // no-op
    }
    return new TempoMap(filtered, [...this.timeSigEvents]);
  }

  addTimeSignatureEvent(event: TimeSignatureEvent): TempoMap {
    return new TempoMap([...this.tempoEvents], [...this.timeSigEvents, event]);
  }

  updateTimeSignatureEvent(
    id: string,
    changes: Partial<TimeSignatureEvent>,
  ): TempoMap {
    return new TempoMap(
      [...this.tempoEvents],
      this.timeSigEvents.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    );
  }

  removeTimeSignatureEvent(id: string): TempoMap {
    const filtered = this.timeSigEvents.filter((e) => e.id !== id);
    if (filtered.length === 0 || filtered[0]!.beat !== 0) {
      return this;
    }
    return new TempoMap([...this.tempoEvents], filtered);
  }

  // -----------------------------------------------------------------------
  // Private: segment building
  // -----------------------------------------------------------------------

  private rebuild(): void {
    this.rebuildTempoSegments();
    this.rebuildTimeSigSegments();
  }

  private rebuildTempoSegments(): void {
    const events = this.tempoEvents;
    this.tempoSegments = [];
    let cumulativeTime = 0;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      const nextEv = events[i + 1];
      const nextBeat = nextEv ? nextEv.beat : Infinity;
      const isRamp = ev.curveType === 'linear' && nextEv != null;
      const endBpm = isRamp ? nextEv!.bpm : ev.bpm;

      const seg: TempoSegment = {
        startBeat: ev.beat,
        endBeat: nextBeat,
        startBpm: ev.bpm,
        endBpm,
        startTime: cumulativeTime,
      };
      this.tempoSegments.push(seg);

      // Accumulate time for the next segment
      if (isFinite(nextBeat)) {
        cumulativeTime += this.segmentBeatsToSeconds(seg, nextBeat);
      }
    }
  }

  private rebuildTimeSigSegments(): void {
    const events = this.timeSigEvents;
    this.timeSigSegments = [];
    let currentBar = 1;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]!;
      const nextEv = events[i + 1];
      const nextBeat = nextEv ? nextEv.beat : Infinity;
      const beatsPerBar = ev.numerator * (4 / ev.denominator);

      this.timeSigSegments.push({
        startBeat: ev.beat,
        endBeat: nextBeat,
        numerator: ev.numerator,
        denominator: ev.denominator,
        beatsPerBar,
        startBar: currentBar,
      });

      if (isFinite(nextBeat)) {
        const beatsInSeg = nextBeat - ev.beat;
        currentBar += Math.round(beatsInSeg / beatsPerBar);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private: per-segment math
  // -----------------------------------------------------------------------

  /**
   * Seconds elapsed from segment start to `beat` within a given segment.
   */
  private segmentBeatsToSeconds(seg: TempoSegment, beat: number): number {
    const localBeat = beat - seg.startBeat;
    if (localBeat <= 0) return 0;

    if (seg.startBpm === seg.endBpm) {
      // Constant tempo
      return localBeat * 60 / seg.startBpm;
    }

    // Linear ramp: integral of 60/T(b) db
    const segLen = seg.endBeat - seg.startBeat;
    const alpha = (seg.endBpm - seg.startBpm) / segLen; // BPM change per beat
    const currentTempo = seg.startBpm + alpha * localBeat;
    return (60 / alpha) * Math.log(currentTempo / seg.startBpm);
  }

  /**
   * Beats elapsed from segment start given `seconds` of absolute time.
   */
  private segmentSecondsToBeat(seg: TempoSegment, seconds: number): number {
    const localTime = seconds - seg.startTime;
    if (localTime <= 0) return 0;

    if (seg.startBpm === seg.endBpm) {
      return localTime * seg.startBpm / 60;
    }

    const segLen = seg.endBeat - seg.startBeat;
    const alpha = (seg.endBpm - seg.startBpm) / segLen;
    return (seg.startBpm / alpha) * (Math.exp(alpha * localTime / 60) - 1);
  }

  // -----------------------------------------------------------------------
  // Private: segment lookup (binary search)
  // -----------------------------------------------------------------------

  private findTempoSegment(beat: number): TempoSegment {
    const segs = this.tempoSegments;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid]!.startBeat <= beat) lo = mid;
      else hi = mid - 1;
    }
    return segs[lo]!;
  }

  private findTempoSegmentByTime(seconds: number): TempoSegment {
    const segs = this.tempoSegments;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid]!.startTime <= seconds) lo = mid;
      else hi = mid - 1;
    }
    return segs[lo]!;
  }

  private findTimeSigSegment(beat: number): TimeSigSegment {
    const segs = this.timeSigSegments;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid]!.startBeat <= beat) lo = mid;
      else hi = mid - 1;
    }
    return segs[lo]!;
  }
}
