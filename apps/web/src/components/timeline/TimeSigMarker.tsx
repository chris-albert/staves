import { useState, useRef, useEffect, useCallback } from 'react';
import type { TimeSignatureEventData } from '@staves/storage';

interface TimeSigMarkerProps {
  event: TimeSignatureEventData;
  x: number;
  onUpdate: (id: string, changes: Partial<TimeSignatureEventData>) => void;
  onRemove: (id: string) => void;
}

export function TimeSigMarker({ event, x, onUpdate, onRemove }: TimeSigMarkerProps) {
  const [editing, setEditing] = useState(false);
  const [numInput, setNumInput] = useState(String(event.numerator));
  const [denInput, setDenInput] = useState(String(event.denominator));
  const popoverRef = useRef<HTMLDivElement>(null);
  const isFixed = event.beat === 0;

  const commit = useCallback(() => {
    const parsedNum = parseInt(numInput, 10);
    const parsedDen = parseInt(denInput, 10);
    if (
      !isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 32 &&
      !isNaN(parsedDen) && [4, 8, 16].includes(parsedDen)
    ) {
      onUpdate(event.id, { numerator: parsedNum, denominator: parsedDen });
    } else {
      setNumInput(String(event.numerator));
      setDenInput(String(event.denominator));
    }
    setEditing(false);
  }, [numInput, denInput, event, onUpdate]);

  // Close popover on outside click
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        commit();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing, commit]);

  return (
    <div
      className="absolute flex items-center"
      style={{ left: x, top: 0, height: '100%' }}
    >
      <button
        className="group relative -translate-x-1/2 rounded px-1 py-px text-[9px] font-medium text-sky-400/80 hover:bg-zinc-800 hover:text-sky-300"
        onClick={() => {
          setNumInput(String(event.numerator));
          setDenInput(String(event.denominator));
          setEditing(true);
        }}
      >
        {event.numerator}/{event.denominator}
        {/* Delete button on hover (not for beat-0) */}
        {!isFixed && (
          <button
            className="absolute -right-2 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-zinc-700 text-[8px] text-zinc-300 hover:bg-red-600 hover:text-white group-hover:flex"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(event.id);
            }}
          >
            ×
          </button>
        )}
      </button>

      {/* Time signature editor popover */}
      {editing && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-50 mt-1 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-800 p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={32}
              value={numInput}
              onChange={(e) => setNumInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                  setNumInput(String(event.numerator));
                  setDenInput(String(event.denominator));
                  setEditing(false);
                }
              }}
              className="w-8 rounded bg-zinc-900 px-1 py-0.5 text-center font-mono text-[11px] text-zinc-100 outline-none ring-1 ring-sky-500/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              autoFocus
            />
            <span className="text-[11px] text-zinc-500">/</span>
            <select
              value={denInput}
              onChange={(e) => setDenInput(e.target.value)}
              className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-[11px] text-zinc-100 outline-none ring-1 ring-sky-500/50"
            >
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="16">16</option>
            </select>
            <button
              onClick={commit}
              className="rounded bg-sky-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-sky-500"
            >
              ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
