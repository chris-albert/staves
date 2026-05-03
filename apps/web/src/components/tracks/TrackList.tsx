import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { TrackHeader } from './TrackHeader';
import { DrumTrackHeader } from './DrumTrackHeader';
import type { AudioDevice } from '@/hooks/useAudioDevices';
import type { StereoLevel } from '@/hooks/useTrackLevels';

interface TrackListProps {
  onAddTrack: () => void;
  onAddDrumTrack?: () => void;
  recordingLevel: number;
  audioInputs: AudioDevice[];
  trackLevels: Map<string, StereoLevel>;
}

export function TrackList({ onAddTrack, onAddDrumTrack, recordingLevel, audioInputs, trackLevels }: TrackListProps) {
  const tracks = useProjectStore((s) => s.tracks);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setShowAddMenu(false);
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [showAddMenu]);

  return (
    <div className="flex flex-col">
      {tracks.map((track) => {
        const playback = trackLevels.get(track.id) ?? [0, 0] as StereoLevel;
        const stereo: StereoLevel = track.isArmed && recordingLevel > 0
          ? [recordingLevel, recordingLevel]
          : playback;

        if (track.type === 'drum') {
          return (
            <DrumTrackHeader
              key={track.id}
              track={track}
              stereoLevel={stereo}
            />
          );
        }

        return (
          <TrackHeader
            key={track.id}
            track={track}
            stereoLevel={stereo}
            audioInputs={audioInputs}
          />
        );
      })}
      <div className="relative mx-3 my-2" ref={menuRef}>
        <button
          onClick={() => setShowAddMenu((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 text-xs text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 1v8M1 5h8" />
          </svg>
          Add Track
        </button>
        {showAddMenu && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800 shadow-xl">
            <button
              onClick={() => { onAddTrack(); setShowAddMenu(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-400">
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M4 3h4M3 9h6" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
              </svg>
              Audio Track
            </button>
            {onAddDrumTrack && (
              <button
                onClick={() => { onAddDrumTrack(); setShowAddMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-400">
                  <ellipse cx="6" cy="7.5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1" />
                  <path d="M1 5v2.5M11 5v2.5" stroke="currentColor" strokeWidth="1" />
                  <ellipse cx="6" cy="5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
                </svg>
                Drum Track
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
