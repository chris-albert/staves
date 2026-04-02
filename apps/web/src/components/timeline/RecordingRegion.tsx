import { useTransportStore } from '@/stores/transportStore';
import { useProjectStore } from '@/stores/projectStore';

interface RecordingRegionProps {
  zoom: number;
  scrollLeft: number;
  trackHeight: number;
}

/**
 * Shows a red translucent region on the armed track's lane
 * that grows as recording progresses.
 */
export function RecordingRegion({ zoom, scrollLeft, trackHeight }: RecordingRegionProps) {
  const isRecording = useTransportStore((s) => s.isRecording);
  const startBeat = useTransportStore((s) => s.recordingStartBeat);
  const trackId = useTransportStore((s) => s.recordingTrackId);
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const tracks = useProjectStore((s) => s.tracks);

  if (!isRecording || !trackId) return null;

  const trackIndex = tracks.findIndex((t) => t.id === trackId);
  if (trackIndex === -1) return null;

  const left = startBeat * zoom - scrollLeft;
  const width = Math.max(0, (currentBeat - startBeat) * zoom);
  const top = trackIndex * trackHeight;

  return (
    <div
      className="absolute pointer-events-none z-[5] border border-red-500/40 rounded-sm"
      style={{
        left,
        top: top + 4,
        width,
        height: trackHeight - 8,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-medium text-red-400/60 select-none animate-pulse">
          Recording...
        </span>
      </div>
    </div>
  );
}
