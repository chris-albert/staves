import { describe, it, expect } from 'vitest';
import { chunkBlob, reassembleChunks, AudioTransferReceiver } from '../audioSync';

describe('audioSync', () => {
  describe('chunkBlob', () => {
    it('creates a single chunk for small data', () => {
      const data = new ArrayBuffer(100);
      const chunks = chunkBlob('blob-1', data, 'webm-opus', 48000, 5.0, 'project-1');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.chunkIndex).toBe(0);
      expect(chunks[0]!.totalChunks).toBe(1);
      expect(chunks[0]!.blobId).toBe('blob-1');
    });

    it('creates multiple chunks for large data', () => {
      const data = new ArrayBuffer(500 * 1024); // 500KB
      const chunks = chunkBlob('blob-2', data, 'mp4-aac', 44100, 10.0, 'project-1');
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]!.totalChunks).toBe(chunks.length);

      // Verify indices are sequential
      chunks.forEach((c, i) => {
        expect(c.chunkIndex).toBe(i);
      });
    });
  });

  describe('reassembleChunks', () => {
    it('roundtrips chunk/reassemble', () => {
      const original = new ArrayBuffer(300 * 1024);
      const view = new Uint8Array(original);
      for (let i = 0; i < view.length; i++) view[i] = i % 256;

      const chunks = chunkBlob('blob-3', original, 'webm-opus', 48000, 3.0, 'project-1');
      const result = reassembleChunks(chunks);

      expect(result.format).toBe('webm-opus');
      expect(result.sampleRate).toBe(48000);
      expect(result.durationSeconds).toBe(3.0);
      expect(result.data.size).toBe(original.byteLength);
    });

    it('handles out-of-order chunks', () => {
      const data = new ArrayBuffer(500 * 1024);
      const chunks = chunkBlob('blob-4', data, 'mp4-aac', 44100, 5.0, 'project-1');
      const shuffled = [...chunks].reverse();
      const result = reassembleChunks(shuffled);
      expect(result.data.size).toBe(data.byteLength);
    });
  });

  describe('AudioTransferReceiver', () => {
    it('calls onComplete when all chunks received', () => {
      const results: string[] = [];
      const receiver = new AudioTransferReceiver((blobId) => {
        results.push(blobId);
      });

      const data = new ArrayBuffer(500 * 1024);
      const chunks = chunkBlob('blob-5', data, 'webm-opus', 48000, 2.0, 'project-1');

      // Feed chunks one by one
      for (const chunk of chunks) {
        receiver.receive(chunk);
      }

      expect(results).toEqual(['blob-5']);
    });

    it('handles multiple concurrent transfers', () => {
      const results: string[] = [];
      const receiver = new AudioTransferReceiver((blobId) => {
        results.push(blobId);
      });

      const chunks1 = chunkBlob('a', new ArrayBuffer(100), 'webm-opus', 48000, 1.0, 'p1');
      const chunks2 = chunkBlob('b', new ArrayBuffer(100), 'mp4-aac', 44100, 2.0, 'p1');

      // Interleave chunks
      receiver.receive(chunks1[0]!);
      receiver.receive(chunks2[0]!);

      expect(results).toEqual(['a', 'b']); // Both complete since they're 1 chunk each
    });
  });
});
