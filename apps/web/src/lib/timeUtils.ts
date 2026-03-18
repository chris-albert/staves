/**
 * Format a beat position as bars:beats:sixteenths.
 */
export function formatBeatPosition(
  beat: number,
  numerator: number = 4,
): string {
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
