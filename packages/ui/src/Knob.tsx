import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  size?: number;
  label?: string;
}

export function Knob({ value, min, max, onChange, size = 32, label }: KnobProps) {
  const startY = useRef(0);
  const startValue = useRef(0);

  const range = max - min;
  const normalised = (value - min) / range;
  const angle = -135 + normalised * 270;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      startY.current = e.clientY;
      startValue.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!e.buttons) return;
      const dy = startY.current - e.clientY;
      const newValue = Math.min(max, Math.max(min, startValue.current + (dy / 100) * range));
      onChange(newValue);
    },
    [min, max, range, onChange],
  );

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="cursor-pointer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <circle cx="16" cy="16" r="14" fill="none" stroke="#52525b" strokeWidth="2" />
        <line
          x1="16"
          y1="16"
          x2="16"
          y2="4"
          stroke="#e4e4e7"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angle} 16 16)`}
        />
      </svg>
      {label && <span className="text-[9px] leading-none text-zinc-500">{label}</span>}
    </div>
  );
}
