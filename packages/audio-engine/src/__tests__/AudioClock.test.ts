import { describe, it, expect } from 'vitest';
import { AudioClock } from '../AudioClock';

describe('AudioClock', () => {
  it('calculates seconds per beat', () => {
    const clock = new AudioClock(120, 4, 4);
    expect(clock.secondsPerBeat).toBe(0.5);
  });

  it('converts beats to seconds', () => {
    const clock = new AudioClock(120, 4, 4);
    expect(clock.beatsToSeconds(4)).toBe(2);
    expect(clock.beatsToSeconds(0)).toBe(0);
    expect(clock.beatsToSeconds(1)).toBe(0.5);
  });

  it('converts seconds to beats', () => {
    const clock = new AudioClock(120, 4, 4);
    expect(clock.secondsToBeats(2)).toBe(4);
    expect(clock.secondsToBeats(0.5)).toBe(1);
  });

  it('converts beats to bar:beat position', () => {
    const clock = new AudioClock(120, 4, 4);
    expect(clock.beatsToBarBeat(0)).toEqual({ bar: 1, beat: 1 });
    expect(clock.beatsToBarBeat(3)).toEqual({ bar: 1, beat: 4 });
    expect(clock.beatsToBarBeat(4)).toEqual({ bar: 2, beat: 1 });
    expect(clock.beatsToBarBeat(7)).toEqual({ bar: 2, beat: 4 });
  });

  it('handles different BPM', () => {
    const clock = new AudioClock(60, 4, 4);
    expect(clock.secondsPerBeat).toBe(1);
    expect(clock.beatsToSeconds(1)).toBe(1);
  });

  it('handles different time signatures', () => {
    const clock = new AudioClock(120, 3, 4);
    expect(clock.beatsToBarBeat(0)).toEqual({ bar: 1, beat: 1 });
    expect(clock.beatsToBarBeat(2)).toEqual({ bar: 1, beat: 3 });
    expect(clock.beatsToBarBeat(3)).toEqual({ bar: 2, beat: 1 });
  });
});
