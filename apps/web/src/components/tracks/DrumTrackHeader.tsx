import type { Track } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { LevelMeter } from './LevelMeter';
import { Knob } from '@staves/ui';
import { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const TRACK_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#14b8a6', '#a855f7', '#6366f1',
];

interface DrumTrackHeaderProps {
  track: Track;
  stereoLevel: [number, number];
}

export function DrumTrackHeader({ track, stereoLevel }: DrumTrackHeaderProps) {
  const updateTrack = useProjectStore((s) => s.updateTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);
  const tracks = useProjectStore((s) => s.tracks);
  const selectedTrackId = useUiStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useUiStore((s) => s.setSelectedTrackId);
  const isSelected = selectedTrackId === track.id;

  const anySoloed = tracks.some((t) => t.isSolo);
  const effectivelyMuted = anySoloed && !track.isSolo;

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(track.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorRef = useRef<HTMLButtonElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [colorPos, setColorPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  useEffect(() => {
    if (!showColorPicker) return;
    function handleClick(e: MouseEvent) {
      if (
        colorRef.current?.contains(e.target as Node) ||
        colorMenuRef.current?.contains(e.target as Node)
      ) return;
      setShowColorPicker(false);
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [showColorPicker]);

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== track.name) {
      updateTrack(track.id, { name: trimmed });
    } else {
      setNameValue(track.name);
    }
    setEditingName(false);
  }, [nameValue, track.id, track.name, updateTrack]);

  const openColorPicker = useCallback(() => {
    if (!colorRef.current) return;
    const rect = colorRef.current.getBoundingClientRect();
    setColorPos({ top: rect.bottom + 4, left: rect.left });
    setShowColorPicker(true);
  }, []);

  const toggleMute = useCallback(
    () => updateTrack(track.id, { isMuted: !track.isMuted }),
    [track.id, track.isMuted, updateTrack],
  );

  const toggleSolo = useCallback(
    () => updateTrack(track.id, { isSolo: !track.isSolo }),
    [track.id, track.isSolo, updateTrack],
  );

  const handleDelete = useCallback(() => {
    removeTrack(track.id);
  }, [track.id, removeTrack]);

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select')) return;
        setSelectedTrackId(isSelected ? null : track.id);
      }}
      className={`group flex h-20 items-stretch border-b border-zinc-800/80 transition-colors cursor-pointer ${
        isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-900/50'
      }`}
      style={{ opacity: effectivelyMuted ? 0.45 : 1, transition: 'opacity 0.15s ease' }}
    >
      {/* Color bar */}
      <button
        ref={colorRef}
        onClick={openColorPicker}
        className="w-1.5 flex-shrink-0 cursor-pointer hover:w-2 transition-all"
        style={{ backgroundColor: track.color }}
        title="Change track color"
      />

      {showColorPicker && createPortal(
        <div
          ref={colorMenuRef}
          className="fixed z-[100] grid grid-cols-4 gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl"
          style={{ top: colorPos.top, left: colorPos.left }}
        >
          {TRACK_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                updateTrack(track.id, { color: c });
                setShowColorPicker(false);
              }}
              className={`h-5 w-5 rounded-full transition-transform hover:scale-125 ${
                c === track.color ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-800' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>,
        document.body,
      )}

      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2">
        {/* Row 1: name + drum icon + delete */}
        <div className="flex items-center gap-1.5">
          {/* Drum icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-zinc-500">
            <ellipse cx="7" cy="9" rx="6" ry="3" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1 6v3M13 6v3" stroke="currentColor" strokeWidth="1.2" />
            <ellipse cx="7" cy="6" rx="6" ry="3" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
            <path d="M4 3L10 8M10 3L4 8" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
          </svg>

          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setNameValue(track.name);
                  setEditingName(false);
                }
              }}
              className="flex-1 min-w-0 rounded bg-zinc-800 px-1 py-0.5 text-[13px] font-medium text-zinc-100 outline-none ring-1 ring-zinc-600 focus:ring-zinc-400"
            />
          ) : (
            <span
              className="flex-1 truncate text-[13px] font-medium text-zinc-200 cursor-text rounded px-1 py-0.5 -mx-1 hover:bg-zinc-800/60 transition-colors"
              onDoubleClick={() => {
                setNameValue(track.name);
                setEditingName(true);
              }}
              title="Double-click to rename"
            >
              {track.name}
            </span>
          )}
          <button
            onClick={handleDelete}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-700 opacity-0 hover:bg-zinc-800 hover:text-zinc-400 group-hover:opacity-100 transition-all"
            title="Delete track"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>

        {/* Row 2: controls (no record arm for drum tracks) */}
        <div className="flex items-center gap-1">
          <TrackButton active={track.isMuted} color="amber" onClick={toggleMute}>M</TrackButton>
          <TrackButton active={track.isSolo} color="blue" onClick={toggleSolo}>S</TrackButton>

          <div className="ml-1.5 flex items-center gap-2">
            <Knob
              value={track.volume}
              min={0}
              max={1}
              onChange={(v) => updateTrack(track.id, { volume: v })}
              size={18}
              label="Vol"
            />
            <Knob
              value={track.pan}
              min={-1}
              max={1}
              onChange={(v) => updateTrack(track.id, { pan: v })}
              size={18}
              label="Pan"
            />
          </div>
        </div>
      </div>

      {/* Level meter */}
      <LevelMeter levelL={stereoLevel[0]} levelR={stereoLevel[1]} />
    </div>
  );
}

function TrackButton({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: 'amber' | 'blue' | 'red';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClasses = {
    amber: 'bg-amber-600 text-white',
    blue: 'bg-blue-600 text-white',
    red: 'bg-red-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold transition-colors ${
        active ? activeClasses[color] : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}
