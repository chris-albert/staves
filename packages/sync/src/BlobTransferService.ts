import type { WebrtcProvider } from 'y-webrtc';
import { chunkBlob, AudioTransferReceiver, reassembleChunks } from './audioSync';
import type { AudioChunk } from './types';

const CHANNEL_LABEL = 'staves-audio';

// Wire format: [1-byte type][JSON length uint32][JSON metadata][binary data]
const MSG_CHUNK = 1;
const MSG_MANIFEST_REQ = 2;
const MSG_MANIFEST_RES = 3;

type BlobReceivedCallback = (
  blobId: string,
  result: ReturnType<typeof reassembleChunks>,
) => void;

type ProgressCallback = (blobId: string, received: number, total: number) => void;

/**
 * Manages audio blob transfer over dedicated WebRTC data channels.
 * Creates a separate "staves-audio" data channel on each peer connection
 * to avoid interfering with Yjs sync messages.
 */
export class BlobTransferService {
  private channels = new Map<string, RTCDataChannel>();
  private receiver: AudioTransferReceiver;
  private onBlobReceived: BlobReceivedCallback;
  private onProgress: ProgressCallback | null = null;
  private provider: WebrtcProvider;
  private localBlobIds: () => Promise<string[]>;
  private getBlob: (id: string) => Promise<{ data: Blob; format: AudioChunk['format']; sampleRate: number; durationSeconds: number; projectId: string } | undefined>;
  private pendingChunks = new Map<string, number>();
  private destroyed = false;
  private peersObserver: (...args: unknown[]) => void;

  constructor(options: {
    provider: WebrtcProvider;
    onBlobReceived: BlobReceivedCallback;
    onProgress?: ProgressCallback;
    localBlobIds: () => Promise<string[]>;
    getBlob: (id: string) => Promise<{ data: Blob; format: AudioChunk['format']; sampleRate: number; durationSeconds: number; projectId: string } | undefined>;
  }) {
    this.provider = options.provider;
    this.onBlobReceived = options.onBlobReceived;
    this.onProgress = options.onProgress ?? null;
    this.localBlobIds = options.localBlobIds;
    this.getBlob = options.getBlob;

    this.receiver = new AudioTransferReceiver((blobId, result) => {
      this.pendingChunks.delete(blobId);
      this.onBlobReceived(blobId, result);
    });

    // Set up channels on existing and new peer connections
    this.peersObserver = () => this.setupChannels();
    this.provider.on('peers', this.peersObserver);
    this.setupChannels();
  }

  /** Send a recorded blob to all connected peers. */
  async sendBlob(
    blobId: string,
    data: ArrayBuffer,
    format: AudioChunk['format'],
    sampleRate: number,
    durationSeconds: number,
    projectId: string,
  ): Promise<void> {
    const chunks = chunkBlob(blobId, data, format, sampleRate, durationSeconds, projectId);
    for (const chunk of chunks) {
      const msg = serializeChunk(chunk);
      for (const channel of this.channels.values()) {
        if (channel.readyState === 'open') {
          // Respect backpressure
          if (channel.bufferedAmount > 1024 * 1024) {
            await waitForDrain(channel);
          }
          channel.send(msg);
        }
      }
    }
  }

  /** Set progress callback. */
  setProgressCallback(cb: ProgressCallback | null): void {
    this.onProgress = cb;
  }

  destroy(): void {
    this.destroyed = true;
    this.provider.off('peers', this.peersObserver);
    for (const channel of this.channels.values()) {
      channel.close();
    }
    this.channels.clear();
  }

  // --- Internal ---

  private setupChannels(): void {
    if (this.destroyed) return;

    // Access the y-webrtc room's peer connections
    const room = (this.provider as unknown as { room: { webrtcConns: Map<string, { peer: { _pc: RTCPeerConnection } }> } }).room;
    if (!room?.webrtcConns) return;

    for (const [peerId, conn] of room.webrtcConns) {
      if (this.channels.has(peerId)) continue;

      const pc: RTCPeerConnection = conn.peer._pc;
      if (!pc) continue;

      // Try to create a data channel (initiator side)
      try {
        const ch = pc.createDataChannel(CHANNEL_LABEL, { ordered: true });
        ch.binaryType = 'arraybuffer';
        this.attachChannel(peerId, ch);
      } catch {
        // Not the initiator — listen for the channel
      }

      // Listen for incoming data channels (responder side)
      pc.addEventListener('datachannel', (e) => {
        if (e.channel.label === CHANNEL_LABEL) {
          e.channel.binaryType = 'arraybuffer';
          this.attachChannel(peerId, e.channel);
        }
      });
    }
  }

  private attachChannel(peerId: string, channel: RTCDataChannel): void {
    this.channels.set(peerId, channel);

    channel.addEventListener('open', () => {
      // When a new peer connects, exchange manifests to sync missing blobs
      this.sendManifestRequest(channel);
    });

    channel.addEventListener('message', (e) => {
      this.handleMessage(peerId, e.data as ArrayBuffer);
    });

    channel.addEventListener('close', () => {
      this.channels.delete(peerId);
    });

    // If channel is already open (e.g., created by remote), send manifest immediately
    if (channel.readyState === 'open') {
      this.sendManifestRequest(channel);
    }
  }

  private async handleMessage(peerId: string, data: ArrayBuffer): Promise<void> {
    const view = new DataView(data);
    const type = view.getUint8(0);

    if (type === MSG_CHUNK) {
      const chunk = deserializeChunk(data);
      // Track progress
      const count = (this.pendingChunks.get(chunk.blobId) ?? 0) + 1;
      this.pendingChunks.set(chunk.blobId, count);
      this.onProgress?.(chunk.blobId, count, chunk.totalChunks);
      this.receiver.receive(chunk);
    } else if (type === MSG_MANIFEST_REQ) {
      await this.handleManifestRequest(peerId, data);
    } else if (type === MSG_MANIFEST_RES) {
      await this.handleManifestResponse(data);
    }
  }

  private sendManifestRequest(channel: RTCDataChannel): void {
    this.localBlobIds().then((ids) => {
      const json = JSON.stringify(ids);
      const jsonBytes = new TextEncoder().encode(json);
      const buf = new ArrayBuffer(1 + jsonBytes.byteLength);
      const view = new DataView(buf);
      view.setUint8(0, MSG_MANIFEST_REQ);
      new Uint8Array(buf, 1).set(jsonBytes);
      if (channel.readyState === 'open') {
        channel.send(buf);
      }
    });
  }

  private async handleManifestRequest(peerId: string, data: ArrayBuffer): Promise<void> {
    const jsonBytes = new Uint8Array(data, 1);
    const remoteBlobIds: string[] = JSON.parse(new TextDecoder().decode(jsonBytes));
    const localIds = await this.localBlobIds();

    // Send back our manifest so the remote peer can request what they need too
    const channel = this.channels.get(peerId);
    if (channel?.readyState === 'open') {
      const json = JSON.stringify(localIds);
      const jsonB = new TextEncoder().encode(json);
      const buf = new ArrayBuffer(1 + jsonB.byteLength);
      new DataView(buf).setUint8(0, MSG_MANIFEST_RES);
      new Uint8Array(buf, 1).set(jsonB);
      channel.send(buf);
    }

    // Send blobs the remote peer doesn't have
    const remoteSet = new Set(remoteBlobIds);
    for (const id of localIds) {
      if (remoteSet.has(id)) continue;
      const blob = await this.getBlob(id);
      if (!blob) continue;
      const arrayBuffer = await blob.data.arrayBuffer();
      const chunks = chunkBlob(id, arrayBuffer, blob.format, blob.sampleRate, blob.durationSeconds, blob.projectId);
      for (const chunk of chunks) {
        const msg = serializeChunk(chunk);
        if (channel?.readyState === 'open') {
          if (channel.bufferedAmount > 1024 * 1024) {
            await waitForDrain(channel);
          }
          channel.send(msg);
        }
      }
    }
  }

  private async handleManifestResponse(data: ArrayBuffer): Promise<void> {
    // The remote peer tells us what they have — we send what they're missing
    // This is handled symmetrically in handleManifestRequest above.
    // The response lets us know we can request blobs from them in the future.
    // For now, the request handler already handles sending missing blobs.
  }
}

// --- Serialization ---

function serializeChunk(chunk: AudioChunk): ArrayBuffer {
  const meta = JSON.stringify({
    blobId: chunk.blobId,
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.totalChunks,
    format: chunk.format,
    sampleRate: chunk.sampleRate,
    durationSeconds: chunk.durationSeconds,
    projectId: chunk.projectId,
  });
  const metaBytes = new TextEncoder().encode(meta);
  const buf = new ArrayBuffer(1 + 4 + metaBytes.byteLength + chunk.data.byteLength);
  const view = new DataView(buf);
  view.setUint8(0, MSG_CHUNK);
  view.setUint32(1, metaBytes.byteLength);
  new Uint8Array(buf, 5, metaBytes.byteLength).set(metaBytes);
  new Uint8Array(buf, 5 + metaBytes.byteLength).set(new Uint8Array(chunk.data));
  return buf;
}

function deserializeChunk(buf: ArrayBuffer): AudioChunk {
  const view = new DataView(buf);
  const metaLen = view.getUint32(1);
  const metaBytes = new Uint8Array(buf, 5, metaLen);
  const meta = JSON.parse(new TextDecoder().decode(metaBytes));
  const data = buf.slice(5 + metaLen);
  return { ...meta, data };
}

function waitForDrain(channel: RTCDataChannel): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (channel.bufferedAmount < 512 * 1024) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}
