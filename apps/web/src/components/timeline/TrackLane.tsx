import type { Track, Clip } from '@staves/storage';
import { ClipView } from './ClipView';

interface TrackLaneProps {
  track: Track;
  clips: Clip[];
  zoom: number;
  scrollLeft: number;
  top: number;
  height: number;
}

export function TrackLane({ track, clips, zoom, scrollLeft, top, height }: TrackLaneProps) {
  return (
    <div
      className="absolute left-0 right-0 border-b border-zinc-800/50"
      style={{ top, height }}
    >
      {clips.map((clip) => (
        <ClipView
          key={clip.id}
          clip={clip}
          color={track.color}
          zoom={zoom}
          scrollLeft={scrollLeft}
          laneHeight={height}
        />
      ))}
    </div>
  );
}
