import { useRef, useCallback, useState, type ReactNode } from 'react';
import { StatusBar } from './StatusBar';
import type { ConnectionStatus } from '@/hooks/useSync';

interface AppShellProps {
  toolbar: ReactNode;
  trackList: ReactNode;
  timeline: ReactNode;
  connectionStatus: ConnectionStatus;
  peerCount: number;
  roomId: string | null;
  onShareRoom: () => void;
}

export function AppShell({ toolbar, trackList, timeline, connectionStatus, peerCount, roomId, onShareRoom }: AppShellProps) {
  const trackListRef = useRef<HTMLDivElement>(null);
  const [, setScrollTop] = useState(0);

  const handleTrackListScroll = useCallback(() => {
    if (trackListRef.current) {
      setScrollTop(trackListRef.current.scrollTop);
    }
  }, []);

  return (
    <div className="flex h-screen min-w-[1024px] flex-col bg-zinc-950">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        {/* Track list sidebar */}
        <div
          ref={trackListRef}
          className="w-60 flex-shrink-0 border-r border-zinc-800/80 bg-zinc-950 overflow-y-auto"
          onScroll={handleTrackListScroll}
        >
          {/* Spacer aligned to timeline ruler */}
          <div className="h-6 border-b border-zinc-800/80 bg-zinc-900/40" />
          {trackList}
        </div>
        {/* Timeline area */}
        <div className="flex-1 overflow-hidden bg-zinc-950">
          {timeline}
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
