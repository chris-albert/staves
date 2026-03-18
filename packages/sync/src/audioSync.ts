import type { AudioChunk } from './types';

const CHUNK_SIZE = 200 * 1024; // 200KB chunks (under 256KB WebRTC limit)

/**
 * Splits an audio blob into chunks for transfer over WebRTC data channel.
 */
export function chunkBlob(
  blobId: string,
  data: ArrayBuffer,
  format: AudioChunk['format'],
  sampleRate: number,
  durationSeconds: number,
  projectId: string,
): AudioChunk[] {
  const totalChunks = Math.ceil(data.byteLength / CHUNK_SIZE);
  const chunks: AudioChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, data.byteLength);
    chunks.push({
      blobId,
      chunkIndex: i,
      totalChunks,
      data: data.slice(start, end),
      format,
      sampleRate,
      durationSeconds,
      projectId,
    });
  }

  return chunks;
}

/**
 * Reassembles chunks into a complete audio blob.
 */
export function reassembleChunks(chunks: AudioChunk[]): {
  data: Blob;
  format: AudioChunk['format'];
  sampleRate: number;
  durationSeconds: number;
  projectId: string;
} {
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const first = sorted[0]!;
  const mimeType = first.format === 'webm-opus' ? 'audio/webm' : 'audio/mp4';

  const buffers = sorted.map((c) => c.data);
  const data = new Blob(buffers, { type: mimeType });

  return {
    data,
    format: first.format,
    sampleRate: first.sampleRate,
    durationSeconds: first.durationSeconds,
    projectId: first.projectId,
  };
}

/** Manages incoming chunked transfers, buffering until complete. */
export class AudioTransferReceiver {
  private pending = new Map<string, AudioChunk[]>();
  private onComplete: (blobId: string, result: ReturnType<typeof reassembleChunks>) => void;

  constructor(onComplete: (blobId: string, result: ReturnType<typeof reassembleChunks>) => void) {
    this.onComplete = onComplete;
  }

  receive(chunk: AudioChunk): void {
    const existing = this.pending.get(chunk.blobId) ?? [];
    existing.push(chunk);
    this.pending.set(chunk.blobId, existing);

    if (existing.length === chunk.totalChunks) {
      const result = reassembleChunks(existing);
      this.pending.delete(chunk.blobId);
      this.onComplete(chunk.blobId, result);
    }
  }
}

export const audioSync = { chunkBlob, reassembleChunks, AudioTransferReceiver };
