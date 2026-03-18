interface VolumeFaderProps {
  value: number;
  onChange: (value: number) => void;
}

export function VolumeFader({ value, onChange }: VolumeFaderProps) {
  return (
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-100"
      title={`Volume: ${Math.round(value * 100)}%`}
    />
  );
}
