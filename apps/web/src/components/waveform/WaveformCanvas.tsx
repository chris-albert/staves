import { useRef, useEffect } from 'react';
import { useWaveformData } from './useWaveformData';

interface WaveformCanvasProps {
  audioBlobId: string;
  width: number;
  height: number;
  /** Fraction of source audio before the visible region (0–1). */
  offsetRatio?: number;
  /** Fraction of source audio that is visible (0–1). */
  visibleRatio?: number;
}

export function WaveformCanvas({ audioBlobId, width, height, offsetRatio = 0, visibleRatio = 1 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaks = useWaveformData(audioBlobId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

    const mid = height / 2;
    // Only sample peaks from the visible portion of the source audio
    const startIdx = Math.floor(offsetRatio * peaks.length);
    const visiblePeakCount = Math.floor(visibleRatio * peaks.length);
    const step = visiblePeakCount / width;

    for (let x = 0; x < width; x++) {
      const idx = startIdx + Math.floor(x * step);
      const peak = peaks[idx] ?? 0;
      const h = peak * mid;
      ctx.fillRect(x, mid - h, 1, h * 2);
    }
  }, [peaks, width, height, offsetRatio, visibleRatio]);

  if (width <= 0 || height <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="pointer-events-none"
    />
  );
}
