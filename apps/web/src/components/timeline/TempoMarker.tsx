import { useState, useRef, useEffect } from 'react';
import type { TempoEventData } from '@staves/storage';

interface TempoMarkerProps {
  event: TempoEventData;
  x: number;
  onUpdate: (id: string, changes: Partial<TempoEventData>) => void;
  onRemove: (id: string) => void;
}

export function TempoMarker({ event, x, onUpdate, onRemove }: TempoMarkerProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(event.bpm));
  const inputRef = useRef<HTMLInputElement>(null);
  const isFixed = event.beat === 0;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
      onUpdate(event.id, { bpm: parsed });
    } else {
      setInputValue(String(event.bpm));
    }
    setEditing(false);
  };

  // Clamp left so the centered marker never overflows past the left edge
  const clampedX = Math.max(5, x);

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: clampedX, top: 0 }}
    >
      {/* Diamond marker */}
      <button
        className="group relative -translate-x-1/2"
        onClick={() => {
          setInputValue(String(event.bpm));
          setEditing(true);
        }}
        title={`${event.bpm} BPM${event.curveType === 'linear' ? ' (ramp)' : ''}`}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" className="text-amber-400">
          <polygon
            points="4.5,0 9,4.5 4.5,9 0,4.5"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
        {/* Delete button on hover (not for beat-0) */}
        {!isFixed && (
          <button
            className="absolute -right-3 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-zinc-700 text-[8px] text-zinc-300 hover:bg-red-600 hover:text-white group-hover:flex"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(event.id);
            }}
          >
            ×
          </button>
        )}
      </button>

      {/* BPM label or input */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setInputValue(String(event.bpm));
              setEditing(false);
            }
          }}
          className="mt-0.5 w-10 -translate-x-1/2 rounded bg-zinc-800 px-0.5 text-center text-[9px] text-zinc-100 outline-none ring-1 ring-amber-500/50"
        />
      ) : (
        <span className="mt-0.5 -translate-x-1/2 cursor-pointer text-[9px] text-amber-400/80 hover:text-amber-300">
          {event.bpm}
        </span>
      )}

      {/* Ramp indicator */}
      {event.curveType === 'linear' && (
        <span className="mt-px -translate-x-1/2 text-[7px] text-amber-600/60">ramp</span>
      )}
    </div>
  );
}
