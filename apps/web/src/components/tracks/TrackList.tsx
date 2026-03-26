import { useProjectStore } from '@/stores/projectStore';
import { TrackHeader } from './TrackHeader';
import type { AudioDevice } from '@/hooks/useAudioDevices';
import type { StereoLevel } from '@/hooks/useTrackLevels';

interface TrackListProps {
  onAddTrack: () => void;
  recordingLevel: number;
  audioInputs: AudioDevice[];
  trackLevels: Map<string, StereoLevel>;
}

export function TrackList({ onAddTrack, recordingLevel, audioInputs, trackLevels }: TrackListProps) {
  const tracks = useProjectStore((s) => s.tracks);

  return (
    <div className="flex flex-col">
      {tracks.map((track) => {
        const playback = trackLevels.get(track.id) ?? [0, 0] as StereoLevel;
        // Show recording input level (mono → both channels) when armed, otherwise playback
        const stereo: StereoLevel = track.isArmed && recordingLevel > 0
          ? [recordingLevel, recordingLevel]
          : playback;
        return (
          <TrackHeader
            key={track.id}
            track={track}
            stereoLevel={stereo}
            audioInputs={audioInputs}
          />
        );
      })}
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
