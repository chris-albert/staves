import { describe, it, expect } from 'vitest';
import { formatBeatPosition, formatTime, snapToGrid, dbToGain, gainToDb } from '../timeUtils';

describe('timeUtils', () => {
  describe('formatBeatPosition', () => {
    it('formats beat 0 as 1.1.1', () => {
      expect(formatBeatPosition(0)).toBe('1.1.1');
    });

    it('formats whole beats', () => {
      expect(formatBeatPosition(4)).toBe('2.1.1');
      expect(formatBeatPosition(7)).toBe('2.4.1');
    });

    it('formats fractional beats', () => {
      expect(formatBeatPosition(0.25)).toBe('1.1.2');
      expect(formatBeatPosition(0.5)).toBe('1.1.3');
      expect(formatBeatPosition(0.75)).toBe('1.1.4');
    });
  });

  describe('formatTime', () => {
    it('formats zero', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('formats seconds with padding', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(65)).toBe('1:05');
    });
  });

  describe('snapToGrid', () => {
    it('snaps to beat', () => {
      expect(snapToGrid(1.3, 1)).toBe(1);
      expect(snapToGrid(1.7, 1)).toBe(2);
    });

    it('snaps to quarter beat', () => {
      expect(snapToGrid(1.1, 0.25)).toBe(1.0);
      expect(snapToGrid(1.15, 0.25)).toBe(1.25);
    });
  });

  describe('db/gain conversion', () => {
    it('converts 0dB to gain 1', () => {
      expect(dbToGain(0)).toBeCloseTo(1);
    });

    it('converts -6dB to ~0.5 gain', () => {
      expect(dbToGain(-6)).toBeCloseTo(0.5, 1);
    });

    it('roundtrips', () => {
      expect(gainToDb(dbToGain(-12))).toBeCloseTo(-12);
    });
  });
});
