import { useTransportStore } from '@/stores/transportStore';

interface PlayheadProps {
  zoom: number;
  scrollLeft: number;
  totalHeight: number;
}

export function Playhead({ zoom, scrollLeft, totalHeight }: PlayheadProps) {
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const x = currentBeat * zoom - scrollLeft;

  if (x < -1 || x > window.innerWidth) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 z-20 w-px bg-white"
      style={{ left: x, height: totalHeight || 200 }}
    >
      <div className="absolute -left-1 -top-1 h-2 w-2 rotate-45 bg-white" />
    </div>
  );
}
