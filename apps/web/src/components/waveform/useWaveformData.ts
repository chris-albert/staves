import { useEffect, useState } from 'react';
import { audioBlobStore } from '@staves/storage';

const SAMPLES_PER_PEAK = 512;
const peakCache = new Map<string, Float32Array>();

/**
 * Loads or computes waveform peak data for an audio blob.
 * Returns a Float32Array of peak values (0–1) or null while loading.
 */
export function useWaveformData(audioBlobId: string): Float32Array | null {
  const [peaks, setPeaks] = useState<Float32Array | null>(
    peakCache.get(audioBlobId) ?? null,
  );

  useEffect(() => {
    if (peakCache.has(audioBlobId)) {
      setPeaks(peakCache.get(audioBlobId)!);
      return;
    }

    let cancelled = false;

    async function compute() {
      // Check if we have cached waveform data in IndexedDB
      const cached = await audioBlobStore.getWaveform(audioBlobId);
      if (cached) {
        peakCache.set(audioBlobId, cached.peaks);
        if (!cancelled) setPeaks(cached.peaks);
        return;
      }

      // Load and decode audio
      const audioBlob = await audioBlobStore.get(audioBlobId);
      if (!audioBlob || cancelled) return;

      const audioContext = new OfflineAudioContext(1, 1, 44100);
      const arrayBuffer = await audioBlob.data.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const numPeaks = Math.ceil(channelData.length / SAMPLES_PER_PEAK);
      const peakData = new Float32Array(numPeaks);

      for (let i = 0; i < numPeaks; i++) {
        const start = i * SAMPLES_PER_PEAK;
        const end = Math.min(start + SAMPLES_PER_PEAK, channelData.length);
        let max = 0;
        for (let j = start; j < end; j++) {
          const abs = Math.abs(channelData[j]!);
          if (abs > max) max = abs;
        }
        peakData[i] = max;
      }

      // Cache in memory and IndexedDB
      peakCache.set(audioBlobId, peakData);
      await audioBlobStore.storeWaveform(audioBlobId, peakData, SAMPLES_PER_PEAK);

      if (!cancelled) setPeaks(peakData);
    }

    compute();
    return () => { cancelled = true; };
  }, [audioBlobId]);

  return peaks;
}
