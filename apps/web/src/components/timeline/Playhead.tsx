import { useTransportStore } from '@/stores/transportStore';

interface PlayheadProps {
  zoom: number;
  scrollLeft: number;
}

export function Playhead({ zoom, scrollLeft }: PlayheadProps) {
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const x = currentBeat * zoom - scrollLeft;

  if (x < -1 || x > window.innerWidth) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-white"
      style={{ left: x }}
    >
      <div className="absolute -left-1 -top-1 h-2 w-2 rotate-45 bg-white" />
    </div>
  );
}
