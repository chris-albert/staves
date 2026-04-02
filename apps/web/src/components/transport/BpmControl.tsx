import { useState, useCallback } from 'react';
import { useTransportStore } from '@/stores/transportStore';

interface BpmControlProps {
  bpm: number;
  onChange: (bpm: number) => void;
}

export function BpmControl({ bpm, onChange }: BpmControlProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(Math.round(bpm)));
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const displayBpm = Math.round(bpm);

  const commit = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
      onChange(parsed);
    } else {
      setInputValue(String(displayBpm));
    }
    setEditing(false);
  }, [inputValue, displayBpm, onChange]);

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
            setInputValue(String(displayBpm));
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
        if (isPlaying) return; // read-only during playback
        setInputValue(String(displayBpm));
        setEditing(true);
      }}
      className={`rounded px-1.5 py-0.5 font-mono text-xs transition-colors tabular-nums ${
        isPlaying
          ? 'text-zinc-500 cursor-default'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
      title={isPlaying ? 'BPM (read-only during playback)' : 'Click to edit BPM'}
    >
      {displayBpm} <span className="text-zinc-600">bpm</span>
    </button>
  );
}
