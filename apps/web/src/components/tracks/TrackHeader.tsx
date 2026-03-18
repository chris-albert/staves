import type { Track } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { VolumeFader } from './VolumeFader';
import { LevelMeter } from './LevelMeter';
import { InputSelect } from './InputSelect';
import { Knob } from '@staves/ui';
import { useCallback } from 'react';
import type { AudioDevice } from '@/hooks/useAudioDevices';

interface TrackHeaderProps {
  track: Track;
  recordingLevel: number;
  audioInputs: AudioDevice[];
}

export function TrackHeader({ track, recordingLevel, audioInputs }: TrackHeaderProps) {
  const updateTrack = useProjectStore((s) => s.updateTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);

  const toggleMute = useCallback(
    () => updateTrack(track.id, { isMuted: !track.isMuted }),
    [track.id, track.isMuted, updateTrack],
  );

  const toggleSolo = useCallback(
    () => updateTrack(track.id, { isSolo: !track.isSolo }),
    [track.id, track.isSolo, updateTrack],
  );

  const toggleArm = useCallback(
    () => updateTrack(track.id, { isArmed: !track.isArmed }),
    [track.id, track.isArmed, updateTrack],
  );

  const handleDelete = useCallback(() => {
    removeTrack(track.id);
  }, [track.id, removeTrack]);

  return (
    <div
      className="group flex items-stretch border-b border-zinc-800/80 transition-colors hover:bg-zinc-900/50"
      style={{ minHeight: 80 }}
    >
      {/* Color bar */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: track.color }} />

      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2">
        {/* Row 1: name + input select + delete */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1 truncate text-[13px] font-medium text-zinc-200">{track.name}</span>
          <InputSelect
            devices={audioInputs}
            value={track.inputDeviceId}
            onChange={(id) => updateTrack(track.id, { inputDeviceId: id })}
          />
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

        {/* Row 2: controls */}
        <div className="flex items-center gap-1">
          <TrackButton active={track.isMuted} color="amber" onClick={toggleMute}>M</TrackButton>
          <TrackButton active={track.isSolo} color="blue" onClick={toggleSolo}>S</TrackButton>
          <TrackButton active={track.isArmed} color="red" onClick={toggleArm}>R</TrackButton>

          <div className="ml-1">
            <Knob
              value={track.pan}
              min={-1}
              max={1}
              onChange={(v) => updateTrack(track.id, { pan: v })}
              size={18}
            />
          </div>

          <VolumeFader
            value={track.volume}
            onChange={(v) => updateTrack(track.id, { volume: v })}
          />

          {track.isArmed && <LevelMeter level={recordingLevel} />}
        </div>
      </div>
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
