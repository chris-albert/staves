import { useProjectStore } from '@/stores/projectStore';
import { TrackHeader } from './TrackHeader';
import type { AudioDevice } from '@/hooks/useAudioDevices';

interface TrackListProps {
  onAddTrack: () => void;
  recordingLevel: number;
  audioInputs: AudioDevice[];
}

export function TrackList({ onAddTrack, recordingLevel, audioInputs }: TrackListProps) {
  const tracks = useProjectStore((s) => s.tracks);

  return (
    <div className="flex flex-col">
      {tracks.map((track) => (
        <TrackHeader
          key={track.id}
          track={track}
          recordingLevel={track.isArmed ? recordingLevel : 0}
          audioInputs={audioInputs}
        />
      ))}
      <button
        onClick={onAddTrack}
        className="mx-3 my-2 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 py-2 text-xs text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M5 1v8M1 5h8" />
        </svg>
        Add Track
      </button>
    </div>
  );
}
