import { useRef, useCallback, useState, type ReactNode } from 'react';
import { StatusBar } from './StatusBar';
import type { ConnectionStatus } from '@/hooks/useSync';

interface AppShellProps {
  toolbar: ReactNode;
  trackList: ReactNode;
  metronomeTrack: ReactNode;
  metronomeLane: ReactNode;
  masterTrack: ReactNode;
  masterLane: ReactNode;
  timeline: ReactNode;
  connectionStatus: ConnectionStatus;
  peerCount: number;
  roomId: string | null;
  onShareRoom: () => void;
}

export function AppShell({ toolbar, trackList, metronomeTrack, metronomeLane, masterTrack, masterLane, timeline, connectionStatus, peerCount, roomId, onShareRoom }: AppShellProps) {
  const trackListRef = useRef<HTMLDivElement>(null);
  const [, setScrollTop] = useState(0);

  const handleTrackListScroll = useCallback(() => {
    if (trackListRef.current) {
      setScrollTop(trackListRef.current.scrollTop);
    }
  }, []);

  return (
    <div className="flex h-screen min-w-[1024px] flex-col overflow-hidden bg-zinc-950">
      {toolbar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Scrollable tracks area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Track list sidebar */}
          <div className="w-60 flex-shrink-0 flex flex-col overflow-hidden border-r border-zinc-800/80 bg-zinc-950">
            <div
              ref={trackListRef}
              className="flex-1 overflow-y-auto scrollbar-hidden"
              onScroll={handleTrackListScroll}
            >
              {/* Spacer aligned to timeline ruler */}
              <div className="h-6 border-b border-zinc-800/80 bg-zinc-900/40" />
              {trackList}
            </div>
          </div>
          {/* Timeline area */}
          <div className="flex-1 overflow-hidden bg-zinc-950">
            {timeline}
          </div>
        </div>
        {/* Metronome row pinned above master */}
        <div className="flex flex-shrink-0">
          <div className="w-60 flex-shrink-0 border-r border-zinc-800/80">
            {metronomeTrack}
          </div>
          <div className="flex-1 overflow-hidden">
            {metronomeLane}
          </div>
        </div>
        {/* Master row pinned at bottom: sidebar controls + tempo/time sig lane */}
        <div className="flex flex-shrink-0">
          <div className="w-60 flex-shrink-0 border-r border-zinc-800/80">
            {masterTrack}
          </div>
          <div className="flex-1 overflow-hidden">
            {masterLane}
          </div>
        </div>
      </div>
      <StatusBar
        status={connectionStatus}
        peerCount={peerCount}
        roomId={roomId}
        onShare={onShareRoom}
      />
    </div>
  );
}
