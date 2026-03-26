import { db, type AudioBlob, type WaveformCache } from './db';

function generateId(): string {
  return crypto.randomUUID();
}

export const audioBlobStore = {
  async store(
    projectId: string,
    data: Blob,
    format: AudioBlob['format'],
    sampleRate: number,
    durationSeconds: number,
  ): Promise<AudioBlob> {
    const audioBlob: AudioBlob = {
      id: generateId(),
      projectId,
      data,
      format,
      sampleRate,
      durationSeconds,
      createdAt: Date.now(),
    };
    await db.audioBlobs.add(audioBlob);
    return audioBlob;
  },

  /** Store a blob with a specific ID (used when receiving from a remote peer). */
  async storeWithId(
    id: string,
    projectId: string,
    data: Blob,
    format: AudioBlob['format'],
    sampleRate: number,
    durationSeconds: number,
  ): Promise<AudioBlob> {
    const audioBlob: AudioBlob = {
      id,
      projectId,
      data,
      format,
      sampleRate,
      durationSeconds,
      createdAt: Date.now(),
    };
    await db.audioBlobs.put(audioBlob);
    return audioBlob;
  },

  async get(id: string): Promise<AudioBlob | undefined> {
    return db.audioBlobs.get(id);
  },

  async getForProject(projectId: string): Promise<AudioBlob[]> {
    return db.audioBlobs.where('projectId').equals(projectId).toArray();
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.audioBlobs, db.waveformCache], async () => {
      await db.audioBlobs.delete(id);
      await db.waveformCache.delete(id);
    });
  },

  // --- Waveform Cache ---

  async storeWaveform(audioBlobId: string, peaks: Float32Array, samplesPerPeak: number): Promise<void> {
    await db.waveformCache.put({ audioBlobId, peaks, samplesPerPeak });
  },

  async getWaveform(audioBlobId: string): Promise<WaveformCache | undefined> {
    return db.waveformCache.get(audioBlobId);
  },
};
