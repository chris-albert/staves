import { useTransportStore } from '@/stores/transportStore';

interface LoopRegionProps {
  zoom: number;
  scrollLeft: number;
  totalHeight: number;
}

export function LoopRegion({ zoom, scrollLeft, totalHeight }: LoopRegionProps) {
  const loopStart = useTransportStore((s) => s.loopStart);
  const loopEnd = useTransportStore((s) => s.loopEnd);

  const left = loopStart * zoom - scrollLeft;
  const width = (loopEnd - loopStart) * zoom;

  return (
    <div
      className="pointer-events-none absolute top-0 z-10 bg-yellow-500/10 border-x border-yellow-500/40"
      style={{ left, width, height: totalHeight || 200 }}
    />
  );
}
