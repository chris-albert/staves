import { useState, useCallback } from 'react';

interface BpmControlProps {
  bpm: number;
  onChange: (bpm: number) => void;
}

export function BpmControl({ bpm, onChange }: BpmControlProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(bpm));

  const commit = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
      onChange(parsed);
    } else {
      setInputValue(String(bpm));
    }
    setEditing(false);
  }, [inputValue, bpm, onChange]);

  if (editing) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setInputValue(String(bpm));
            setEditing(false);
          }
        }}
        className="w-14 rounded bg-zinc-800 px-1.5 py-0.5 text-center font-mono text-xs text-zinc-100 outline-none ring-1 ring-zinc-600 focus:ring-zinc-400"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => {
        setInputValue(String(bpm));
        setEditing(true);
      }}
      className="rounded px-1.5 py-0.5 font-mono text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors tabular-nums"
      title="Click to edit BPM"
    >
      {bpm} <span className="text-zinc-600">bpm</span>
    </button>
  );
}
