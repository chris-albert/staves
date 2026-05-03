import type { Track, Clip, DrumPattern } from '@staves/storage';
import { ClipView } from './ClipView';
import { DrumClipView } from './DrumClipView';

interface TrackLaneProps {
  track: Track;
  clips: Clip[];
  drumPatterns: DrumPattern[];
  zoom: number;
  scrollLeft: number;
  top: number;
  height: number;
}

export function TrackLane({ track, clips, drumPatterns, zoom, scrollLeft, top, height }: TrackLaneProps) {
  return (
    <div
      className="absolute left-0 right-0 border-b border-zinc-800/50"
      style={{ top, height }}
    >
      {clips.map((clip) => {
        if (clip.drumPatternId) {
          const pattern = drumPatterns.find((p) => p.id === clip.drumPatternId);
          if (!pattern) return null;
          return (
            <DrumClipView
              key={clip.id}
              clip={clip}
              pattern={pattern}
              color={track.color}
              zoom={zoom}
              scrollLeft={scrollLeft}
              laneHeight={height}
            />
          );
        }
        return (
          <ClipView
            key={clip.id}
            clip={clip}
            color={track.color}
            zoom={zoom}
            scrollLeft={scrollLeft}
            laneHeight={height}
          />
        );
      })}
    </div>
  );
}
