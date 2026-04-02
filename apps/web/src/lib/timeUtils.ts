import type { TempoMap } from '@staves/audio-engine';

/**
 * Format a beat position as bars:beats:sixteenths.
 * When a TempoMap is provided, uses it for correct bar/beat counting
 * across time signature changes.
 */
export function formatBeatPosition(
  beat: number,
  tempoMapOrNumerator?: TempoMap | number,
): string {
  if (tempoMapOrNumerator != null && typeof tempoMapOrNumerator === 'object') {
    const pos = tempoMapOrNumerator.beatsToBarBeat(beat);
    return `${pos.bar}.${pos.beat}.${pos.subBeat}`;
  }
  const numerator = (tempoMapOrNumerator as number) ?? 4;
  const bar = Math.floor(beat / numerator) + 1;
  const beatInBar = Math.floor(beat % numerator) + 1;
  const sixteenth = Math.floor((beat % 1) * 4) + 1;
  return `${bar}.${beatInBar}.${sixteenth}`;
}

/**
 * Format seconds as mm:ss.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Snap a beat value to the nearest grid division.
 */
export function snapToGrid(beat: number, division: number): number {
  return Math.round(beat / division) * division;
}

/**
 * Convert decibels to linear gain.
 */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to decibels.
 */
export function gainToDb(gain: number): number {
  return 20 * Math.log10(Math.max(gain, 0.0001));
}
