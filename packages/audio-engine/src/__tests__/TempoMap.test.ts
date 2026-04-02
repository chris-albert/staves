import { describe, it, expect } from 'vitest';
import { TempoMap, type TempoEvent, type TimeSignatureEvent } from '../TempoMap';

// Helper to create events with auto-generated ids
let nextId = 0;
function tempo(beat: number, bpm: number, curveType: 'constant' | 'linear' = 'constant'): TempoEvent {
  return { id: `t${nextId++}`, beat, bpm, curveType };
}
function timeSig(beat: number, numerator: number, denominator: number = 4): TimeSignatureEvent {
  return { id: `ts${nextId++}`, beat, numerator, denominator };
}

describe('TempoMap', () => {
  describe('defaults', () => {
    it('creates a default 120 BPM, 4/4 map', () => {
      const tm = new TempoMap();
      expect(tm.tempoAtBeat(0)).toBe(120);
      expect(tm.timeSignatureAtBeat(0)).toEqual({ numerator: 4, denominator: 4 });
    });
  });

  describe('constant tempo', () => {
    it('converts beats to seconds at 120 BPM', () => {
      const tm = new TempoMap([tempo(0, 120)]);
      expect(tm.beatsToSeconds(0)).toBe(0);
      expect(tm.beatsToSeconds(1)).toBeCloseTo(0.5);
      expect(tm.beatsToSeconds(4)).toBeCloseTo(2);
    });

    it('converts seconds to beats at 120 BPM', () => {
      const tm = new TempoMap([tempo(0, 120)]);
      expect(tm.secondsToBeats(0)).toBe(0);
      expect(tm.secondsToBeats(0.5)).toBeCloseTo(1);
      expect(tm.secondsToBeats(2)).toBeCloseTo(4);
    });

    it('handles 60 BPM', () => {
      const tm = new TempoMap([tempo(0, 60)]);
      expect(tm.beatsToSeconds(1)).toBeCloseTo(1);
      expect(tm.beatsToSeconds(4)).toBeCloseTo(4);
      expect(tm.secondsToBeats(1)).toBeCloseTo(1);
    });

    it('round-trips beats→seconds→beats', () => {
      const tm = new TempoMap([tempo(0, 140)]);
      for (const b of [0, 1, 4, 10, 100]) {
        const s = tm.beatsToSeconds(b);
        expect(tm.secondsToBeats(s)).toBeCloseTo(b, 10);
      }
    });
  });

  describe('multiple constant tempos', () => {
    it('changes tempo at event boundary', () => {
      const tm = new TempoMap([tempo(0, 120), tempo(4, 60)]);
      // First 4 beats at 120 BPM = 2 seconds
      expect(tm.beatsToSeconds(4)).toBeCloseTo(2);
      // Beat 5 = 2s + 1 beat at 60 BPM = 2s + 1s = 3s
      expect(tm.beatsToSeconds(5)).toBeCloseTo(3);
      // Beat 8 = 2s + 4 beats at 60 BPM = 2s + 4s = 6s
      expect(tm.beatsToSeconds(8)).toBeCloseTo(6);
    });

    it('inverts correctly across tempo changes', () => {
      const tm = new TempoMap([tempo(0, 120), tempo(4, 60)]);
      expect(tm.secondsToBeats(2)).toBeCloseTo(4);
      expect(tm.secondsToBeats(3)).toBeCloseTo(5);
      expect(tm.secondsToBeats(6)).toBeCloseTo(8);
    });

    it('reports tempo at beat positions', () => {
      const tm = new TempoMap([tempo(0, 120), tempo(4, 60)]);
      expect(tm.tempoAtBeat(0)).toBe(120);
      expect(tm.tempoAtBeat(3)).toBe(120);
      expect(tm.tempoAtBeat(4)).toBe(60);
      expect(tm.tempoAtBeat(10)).toBe(60);
    });

    it('round-trips across multiple tempo regions', () => {
      const tm = new TempoMap([
        tempo(0, 120),
        tempo(8, 90),
        tempo(16, 180),
      ]);
      for (const b of [0, 4, 8, 12, 16, 20, 50]) {
        const s = tm.beatsToSeconds(b);
        expect(tm.secondsToBeats(s)).toBeCloseTo(b, 8);
      }
    });
  });

  describe('linear ramps', () => {
    it('ramps tempo between events', () => {
      // Ramp from 60→120 over 4 beats
      const tm = new TempoMap([
        tempo(0, 60, 'linear'),
        tempo(4, 120),
      ]);
      // Tempo at midpoint should be 90
      expect(tm.tempoAtBeat(2)).toBeCloseTo(90);
      // Tempo at start
      expect(tm.tempoAtBeat(0)).toBe(60);
      // Tempo at end
      expect(tm.tempoAtBeat(4)).toBe(120);
    });

    it('calculates correct seconds for a ramp', () => {
      // 60→120 over 4 beats: integral of 60/T(b) db where T(b) = 60 + 15b
      const tm = new TempoMap([
        tempo(0, 60, 'linear'),
        tempo(4, 120),
      ]);

      // At beat 0 = 0 seconds
      expect(tm.beatsToSeconds(0)).toBe(0);

      // The integral: (60/alpha) * ln(T(b)/T(0))
      // alpha = (120-60)/4 = 15
      // At beat 4: (60/15) * ln(120/60) = 4 * ln(2) ≈ 2.7726
      expect(tm.beatsToSeconds(4)).toBeCloseTo(4 * Math.log(2), 10);
    });

    it('round-trips beats→seconds→beats through ramp', () => {
      const tm = new TempoMap([
        tempo(0, 80, 'linear'),
        tempo(8, 160),
      ]);
      for (const b of [0, 1, 2, 4, 6, 7.5, 8]) {
        const s = tm.beatsToSeconds(b);
        expect(tm.secondsToBeats(s)).toBeCloseTo(b, 8);
      }
    });

    it('handles ramp followed by constant', () => {
      const tm = new TempoMap([
        tempo(0, 60, 'linear'),
        tempo(4, 120),
        tempo(8, 90),
      ]);
      // After the ramp (beats 4-8) we're at 120 BPM constant
      const t4 = tm.beatsToSeconds(4);
      const t8 = tm.beatsToSeconds(8);

      // Second region: 120→90 is also a ramp because event at 4 has curveType default 'constant'
      // Wait — event at beat 4 has curveType 'constant' (default), so beats 4-8 are constant at 120 BPM
      // 4 beats at 120 BPM = 2 seconds
      expect(t8 - t4).toBeCloseTo(2, 8);

      // Round trip
      for (const b of [0, 2, 4, 6, 8, 10]) {
        expect(tm.secondsToBeats(tm.beatsToSeconds(b))).toBeCloseTo(b, 8);
      }
    });

    it('handles constant followed by ramp', () => {
      const tm = new TempoMap([
        tempo(0, 120),
        tempo(4, 60, 'linear'),
        tempo(8, 180),
      ]);
      // First 4 beats at 120 BPM = 2s
      expect(tm.beatsToSeconds(4)).toBeCloseTo(2);
      // Ramp 60→180 over 4 beats
      const t4 = tm.beatsToSeconds(4);
      const t8 = tm.beatsToSeconds(8);
      const alpha = (180 - 60) / 4; // = 30
      const expected = (60 / alpha) * Math.log(180 / 60);
      expect(t8 - t4).toBeCloseTo(expected, 8);
    });
  });

  describe('time signatures', () => {
    it('converts beats to bar/beat in 4/4', () => {
      const tm = new TempoMap(undefined, [timeSig(0, 4)]);
      expect(tm.beatsToBarBeat(0)).toMatchObject({ bar: 1, beat: 1 });
      expect(tm.beatsToBarBeat(3)).toMatchObject({ bar: 1, beat: 4 });
      expect(tm.beatsToBarBeat(4)).toMatchObject({ bar: 2, beat: 1 });
      expect(tm.beatsToBarBeat(7)).toMatchObject({ bar: 2, beat: 4 });
    });

    it('converts beats to bar/beat in 3/4', () => {
      const tm = new TempoMap(undefined, [timeSig(0, 3)]);
      expect(tm.beatsToBarBeat(0)).toMatchObject({ bar: 1, beat: 1 });
      expect(tm.beatsToBarBeat(2)).toMatchObject({ bar: 1, beat: 3 });
      expect(tm.beatsToBarBeat(3)).toMatchObject({ bar: 2, beat: 1 });
      expect(tm.beatsToBarBeat(5)).toMatchObject({ bar: 2, beat: 3 });
    });

    it('handles time signature changes', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4),  // 4/4 from beat 0
        timeSig(8, 3),  // 3/4 from beat 8 (= bar 3)
      ]);

      // First 8 beats = 2 bars of 4/4
      expect(tm.beatsToBarBeat(0)).toMatchObject({ bar: 1, beat: 1 });
      expect(tm.beatsToBarBeat(7)).toMatchObject({ bar: 2, beat: 4 });

      // After time sig change: bar 3 starts at beat 8 in 3/4
      expect(tm.beatsToBarBeat(8)).toMatchObject({ bar: 3, beat: 1 });
      expect(tm.beatsToBarBeat(10)).toMatchObject({ bar: 3, beat: 3 });
      expect(tm.beatsToBarBeat(11)).toMatchObject({ bar: 4, beat: 1 });
    });

    it('reports correct time signature at beat positions', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4, 4),
        timeSig(8, 3, 4),
      ]);
      expect(tm.timeSignatureAtBeat(0)).toEqual({ numerator: 4, denominator: 4 });
      expect(tm.timeSignatureAtBeat(7)).toEqual({ numerator: 4, denominator: 4 });
      expect(tm.timeSignatureAtBeat(8)).toEqual({ numerator: 3, denominator: 4 });
      expect(tm.timeSignatureAtBeat(20)).toEqual({ numerator: 3, denominator: 4 });
    });

    it('converts beats to bar/beat in 5/8', () => {
      // 5/8: beatsPerBar = 5 * (4/8) = 2.5 quarter-note beats
      // Each eighth note = 0.5 quarter-note beats
      const tm = new TempoMap(undefined, [timeSig(0, 5, 8)]);
      expect(tm.beatsToBarBeat(0)).toMatchObject({ bar: 1, beat: 1 });     // 1st eighth
      expect(tm.beatsToBarBeat(0.5)).toMatchObject({ bar: 1, beat: 2 });   // 2nd eighth
      expect(tm.beatsToBarBeat(1.0)).toMatchObject({ bar: 1, beat: 3 });   // 3rd eighth
      expect(tm.beatsToBarBeat(1.5)).toMatchObject({ bar: 1, beat: 4 });   // 4th eighth
      expect(tm.beatsToBarBeat(2.0)).toMatchObject({ bar: 1, beat: 5 });   // 5th eighth
      expect(tm.beatsToBarBeat(2.5)).toMatchObject({ bar: 2, beat: 1 });   // bar 2
      expect(tm.beatsToBarBeat(5.0)).toMatchObject({ bar: 3, beat: 1 });   // bar 3
    });

    it('converts beats to bar/beat in 6/8', () => {
      // 6/8: beatsPerBar = 6 * (4/8) = 3 quarter-note beats
      const tm = new TempoMap(undefined, [timeSig(0, 6, 8)]);
      expect(tm.beatsToBarBeat(0)).toMatchObject({ bar: 1, beat: 1 });
      expect(tm.beatsToBarBeat(0.5)).toMatchObject({ bar: 1, beat: 2 });
      expect(tm.beatsToBarBeat(2.5)).toMatchObject({ bar: 1, beat: 6 });
      expect(tm.beatsToBarBeat(3.0)).toMatchObject({ bar: 2, beat: 1 });
    });

    it('handles time sig change from 4/4 to 5/8', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4, 4),   // 4/4 from beat 0 (beatsPerBar = 4)
        timeSig(8, 5, 8),   // 5/8 from beat 8 (beatsPerBar = 2.5)
      ]);

      // First 8 beats = 2 bars of 4/4
      expect(tm.beatsToBarBeat(0)).toMatchObject({ bar: 1, beat: 1 });
      expect(tm.beatsToBarBeat(7)).toMatchObject({ bar: 2, beat: 4 });

      // After change: bar 3 starts at beat 8 in 5/8
      expect(tm.beatsToBarBeat(8)).toMatchObject({ bar: 3, beat: 1 });
      expect(tm.beatsToBarBeat(8.5)).toMatchObject({ bar: 3, beat: 2 });
      expect(tm.beatsToBarBeat(10.5)).toMatchObject({ bar: 4, beat: 1 });  // beat 8 + 2.5 = 10.5
    });
  });

  describe('getBarLines', () => {
    it('returns bar positions for 4/4', () => {
      const tm = new TempoMap(undefined, [timeSig(0, 4)]);
      const bars = tm.getBarLines(0, 16);
      expect(bars).toHaveLength(4);
      expect(bars[0]).toEqual({ beat: 0, bar: 1, numerator: 4 });
      expect(bars[1]).toEqual({ beat: 4, bar: 2, numerator: 4 });
      expect(bars[2]).toEqual({ beat: 8, bar: 3, numerator: 4 });
      expect(bars[3]).toEqual({ beat: 12, bar: 4, numerator: 4 });
    });

    it('returns bar positions across time sig change', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4),
        timeSig(8, 3),
      ]);
      const bars = tm.getBarLines(0, 17);
      // bars 1,2 (4/4) at 0,4 then bars 3,4,5 (3/4) at 8,11,14
      expect(bars.map((b) => b.beat)).toEqual([0, 4, 8, 11, 14]);
      expect(bars[2]!.numerator).toBe(3);
    });

    it('handles partial range', () => {
      const tm = new TempoMap(undefined, [timeSig(0, 4)]);
      const bars = tm.getBarLines(5, 13);
      expect(bars.map((b) => b.beat)).toEqual([8, 12]);
    });

    it('returns bar positions for 5/8', () => {
      // 5/8: beatsPerBar = 2.5 quarter-note beats
      const tm = new TempoMap(undefined, [timeSig(0, 5, 8)]);
      const bars = tm.getBarLines(0, 10);
      // Bars at: 0, 2.5, 5.0, 7.5
      expect(bars).toHaveLength(4);
      expect(bars[0]!.beat).toBeCloseTo(0);
      expect(bars[1]!.beat).toBeCloseTo(2.5);
      expect(bars[2]!.beat).toBeCloseTo(5.0);
      expect(bars[3]!.beat).toBeCloseTo(7.5);
      expect(bars[0]!.bar).toBe(1);
      expect(bars[1]!.bar).toBe(2);
    });

    it('returns bar positions for 6/8', () => {
      // 6/8: beatsPerBar = 3 quarter-note beats
      const tm = new TempoMap(undefined, [timeSig(0, 6, 8)]);
      const bars = tm.getBarLines(0, 12);
      expect(bars.map((b) => b.beat)).toEqual([0, 3, 6, 9]);
    });

    it('returns bar positions across 4/4 to 5/8 change', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4, 4),
        timeSig(8, 5, 8),
      ]);
      const bars = tm.getBarLines(0, 16);
      // 4/4: bars at 0, 4 (2 bars = 8 beats)
      // 5/8: bars at 8, 10.5, 13 (beatsPerBar = 2.5)
      expect(bars[0]!.beat).toBeCloseTo(0);
      expect(bars[1]!.beat).toBeCloseTo(4);
      expect(bars[2]!.beat).toBeCloseTo(8);
      expect(bars[3]!.beat).toBeCloseTo(10.5);
      expect(bars[4]!.beat).toBeCloseTo(13);
      // Bar numbering continues
      expect(bars[2]!.bar).toBe(3);
      expect(bars[3]!.bar).toBe(4);
    });
  });

  describe('getBeatLines', () => {
    it('flags downbeats correctly', () => {
      const tm = new TempoMap(undefined, [timeSig(0, 4)]);
      const lines = tm.getBeatLines(0, 8);
      expect(lines).toHaveLength(8);
      expect(lines[0]).toEqual({ beat: 0, isDownbeat: true });
      expect(lines[1]).toEqual({ beat: 1, isDownbeat: false });
      expect(lines[4]).toEqual({ beat: 4, isDownbeat: true });
    });

    it('respects time signature change for downbeats', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4),
        timeSig(4, 3),
      ]);
      const lines = tm.getBeatLines(0, 10);
      // In 4/4: 0=down, 1,2,3=up, then in 3/4: 4=down, 5,6=up, 7=down, 8,9=up
      expect(lines[0]!.isDownbeat).toBe(true);
      expect(lines[3]!.isDownbeat).toBe(false);
      expect(lines[4]!.isDownbeat).toBe(true);
      expect(lines[5]!.isDownbeat).toBe(false);
      expect(lines[6]!.isDownbeat).toBe(false);
      expect(lines[7]!.isDownbeat).toBe(true);
    });

    it('spaces beats at eighth-note intervals for 5/8', () => {
      // 5/8: denominator unit = 0.5 quarter-note beats
      const tm = new TempoMap(undefined, [timeSig(0, 5, 8)]);
      const lines = tm.getBeatLines(0, 5);
      // Should produce: 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5
      expect(lines).toHaveLength(10);
      expect(lines[0]!.beat).toBeCloseTo(0);
      expect(lines[1]!.beat).toBeCloseTo(0.5);
      expect(lines[2]!.beat).toBeCloseTo(1.0);
      expect(lines[5]!.beat).toBeCloseTo(2.5);
      expect(lines[9]!.beat).toBeCloseTo(4.5);
    });

    it('flags downbeats correctly for 5/8', () => {
      const tm = new TempoMap(undefined, [timeSig(0, 5, 8)]);
      const lines = tm.getBeatLines(0, 5);
      // Downbeats at: 0 (bar 1), 2.5 (bar 2) → indices 0 and 5
      expect(lines[0]!.isDownbeat).toBe(true);
      expect(lines[1]!.isDownbeat).toBe(false);
      expect(lines[4]!.isDownbeat).toBe(false);
      expect(lines[5]!.isDownbeat).toBe(true);  // beat 2.5
      expect(lines[6]!.isDownbeat).toBe(false);
    });

    it('handles 4/4 to 5/8 transition for beat lines', () => {
      const tm = new TempoMap(undefined, [
        timeSig(0, 4, 4),
        timeSig(4, 5, 8),
      ]);
      const lines = tm.getBeatLines(0, 6.5);
      // 4/4 region: beats at 0, 1, 2, 3 (integer quarter notes)
      // 5/8 region: beats at 4, 4.5, 5.0, 5.5, 6.0 (eighth notes)
      expect(lines[0]!.beat).toBeCloseTo(0);
      expect(lines[1]!.beat).toBeCloseTo(1);
      expect(lines[2]!.beat).toBeCloseTo(2);
      expect(lines[3]!.beat).toBeCloseTo(3);
      expect(lines[4]!.beat).toBeCloseTo(4);
      expect(lines[5]!.beat).toBeCloseTo(4.5);
      expect(lines[6]!.beat).toBeCloseTo(5.0);
      expect(lines[7]!.beat).toBeCloseTo(5.5);
      expect(lines[8]!.beat).toBeCloseTo(6.0);
      // Downbeats: 0 (bar 1 of 4/4), 4 (bar 3, start of 5/8), 6.5 would be bar 4 but not in range
      expect(lines[0]!.isDownbeat).toBe(true);
      expect(lines[4]!.isDownbeat).toBe(true);
      expect(lines[5]!.isDownbeat).toBe(false);
    });
  });

  describe('immutable mutations', () => {
    it('addTempoEvent returns a new map', () => {
      const tm1 = new TempoMap([tempo(0, 120)]);
      const tm2 = tm1.addTempoEvent(tempo(4, 140));
      expect(tm1.tempoAtBeat(5)).toBe(120);
      expect(tm2.tempoAtBeat(5)).toBe(140);
    });

    it('updateTempoEvent modifies an event', () => {
      const ev = tempo(0, 120);
      const tm1 = new TempoMap([ev]);
      const tm2 = tm1.updateTempoEvent(ev.id, { bpm: 90 });
      expect(tm1.tempoAtBeat(0)).toBe(120);
      expect(tm2.tempoAtBeat(0)).toBe(90);
    });

    it('removeTempoEvent removes a non-first event', () => {
      const ev1 = tempo(0, 120);
      const ev2 = tempo(4, 90);
      const tm1 = new TempoMap([ev1, ev2]);
      const tm2 = tm1.removeTempoEvent(ev2.id);
      expect(tm2.getTempoEvents()).toHaveLength(1);
      expect(tm2.tempoAtBeat(5)).toBe(120);
    });

    it('refuses to remove the beat-0 tempo event', () => {
      const ev = tempo(0, 120);
      const tm = new TempoMap([ev]);
      const tm2 = tm.removeTempoEvent(ev.id);
      expect(tm2).toBe(tm); // same instance, no-op
    });

    it('refuses to remove the beat-0 time sig event', () => {
      const ev = timeSig(0, 4);
      const tm = new TempoMap(undefined, [ev]);
      const tm2 = tm.removeTimeSignatureEvent(ev.id);
      expect(tm2).toBe(tm);
    });
  });

  describe('edge cases', () => {
    it('handles negative beat input', () => {
      const tm = new TempoMap();
      expect(tm.beatsToSeconds(-1)).toBe(0);
      expect(tm.secondsToBeats(-1)).toBe(0);
    });

    it('ensures beat-0 events exist even if not provided', () => {
      const tm = new TempoMap(
        [tempo(4, 100)],
        [timeSig(8, 3)],
      );
      expect(tm.tempoAtBeat(0)).toBe(100);
      expect(tm.timeSignatureAtBeat(0).numerator).toBe(3);
      expect(tm.getTempoEvents()[0]!.beat).toBe(0);
      expect(tm.getTimeSignatureEvents()[0]!.beat).toBe(0);
    });
  });
});
