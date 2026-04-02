import { useUiStore } from '@/stores/uiStore';

interface PeerCursorsProps {
  zoom: number;
  scrollLeft: number;
}

export function PeerCursors({ zoom, scrollLeft }: PeerCursorsProps) {
  const peerCursors = useUiStore((s) => s.peerCursors);

  return (
    <>
      {peerCursors.map((peer) => {
        if (peer.beat === null) return null;
        const x = peer.beat * zoom - scrollLeft;

        return (
          <div key={peer.clientId} className="pointer-events-none absolute top-0 bottom-0 z-15" style={{ left: x }}>
            <div className="h-full w-px" style={{ backgroundColor: peer.color }} />
            <div
              className="absolute -top-5 left-0.5 whitespace-nowrap rounded px-1 py-0.5 text-[9px] text-white"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </div>
          </div>
        );
      })}
    </>
  );
}
