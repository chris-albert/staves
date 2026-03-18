interface LevelMeterProps {
  level: number; // 0–1
  visible?: boolean;
}

export function LevelMeter({ level, visible = true }: LevelMeterProps) {
  const clampedLevel = Math.min(1, Math.max(0, level));
  const height = clampedLevel * 100;

  const color =
    clampedLevel > 0.9 ? '#ef4444' : clampedLevel > 0.7 ? '#eab308' : '#22c55e';

  return (
    <div className={`h-5 w-1.5 rounded-full bg-zinc-800 overflow-hidden flex flex-col-reverse transition-opacity ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div
        className="w-full rounded-full transition-all duration-75"
        style={{ height: `${height}%`, backgroundColor: color }}
      />
    </div>
  );
}
