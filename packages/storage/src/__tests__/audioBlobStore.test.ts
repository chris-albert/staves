import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { audioBlobStore } from '../audioBlobStore';

beforeEach(async () => {
  await db.audioBlobs.clear();
  await db.waveformCache.clear();
});

describe('audioBlobStore', () => {
  it('stores and retrieves an audio blob', async () => {
    const data = new Blob(['test audio data'], { type: 'audio/webm' });
    const stored = await audioBlobStore.store('project-1', data, 'webm-opus', 48000, 5.0);
    expect(stored.id).toBeDefined();
    expect(stored.format).toBe('webm-opus');

    const retrieved = await audioBlobStore.get(stored.id);
    expect(retrieved?.sampleRate).toBe(48000);
    expect(retrieved?.durationSeconds).toBe(5.0);
  });

  it('gets all blobs for a project', async () => {
    const data = new Blob(['audio'], { type: 'audio/webm' });
    await audioBlobStore.store('project-1', data, 'webm-opus', 48000, 1.0);
    await audioBlobStore.store('project-1', data, 'webm-opus', 48000, 2.0);
    await audioBlobStore.store('project-2', data, 'webm-opus', 48000, 3.0);

    const p1Blobs = await audioBlobStore.getForProject('project-1');
    expect(p1Blobs).toHaveLength(2);
  });

  it('stores and retrieves waveform cache', async () => {
    const peaks = new Float32Array([0.1, 0.5, 0.8, 0.3]);
    await audioBlobStore.storeWaveform('blob-1', peaks, 512);

    const cached = await audioBlobStore.getWaveform('blob-1');
    expect(cached?.samplesPerPeak).toBe(512);
    expect(cached?.peaks).toEqual(peaks);
  });

  it('deletes blob and its waveform cache', async () => {
    const data = new Blob(['audio'], { type: 'audio/webm' });
    const stored = await audioBlobStore.store('project-1', data, 'webm-opus', 48000, 1.0);
    const peaks = new Float32Array([0.5]);
    await audioBlobStore.storeWaveform(stored.id, peaks, 512);

    await audioBlobStore.delete(stored.id);
    expect(await audioBlobStore.get(stored.id)).toBeUndefined();
    expect(await audioBlobStore.getWaveform(stored.id)).toBeUndefined();
  });
});
