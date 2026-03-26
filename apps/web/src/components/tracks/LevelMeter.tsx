interface LevelMeterProps {
  levelL: number; // 0–1 linear RMS, left channel
  levelR: number; // 0–1 linear RMS, right channel
}

/** Convert linear RMS to a 0–1 display value using dB scale.
 *  Maps -60dB..0dB to 0..1, which matches how audio meters work in DAWs. */
function rmsToDisplay(rms: number): number {
  if (rms <= 0) return 0;
  const db = 20 * Math.log10(rms);
  const normalized = (db + 60) / 60;
  return Math.max(0, Math.min(1, normalized));
}

export function LevelMeter({ levelL, levelR }: LevelMeterProps) {
  const displayL = rmsToDisplay(levelL);
  const displayR = rmsToDisplay(levelR);

  return (
    <div className="flex flex-shrink-0 gap-px">
      <MeterBar display={displayL} />
      <MeterBar display={displayR} />
    </div>
  );
}

/** Single channel meter bar with green→yellow→red gradient revealed from bottom. */
function MeterBar({ display }: { display: number }) {
  // The bar has a VU gradient background. A dark cover overlays from the top,
  // revealing the gradient proportional to the level.
  const coverHeight = (1 - display) * 100;

  return (
    <div
      className="relative w-[3px] overflow-hidden"
      style={{
        background: 'linear-gradient(to top, #22c55e 0%, #22c55e 55%, #eab308 75%, #ef4444 92%, #dc2626 100%)',
      }}
    >
      <div
        className="absolute top-0 left-0 w-full bg-zinc-800 transition-all duration-75"
        style={{ height: `${coverHeight}%` }}
      />
    </div>
  );
}
