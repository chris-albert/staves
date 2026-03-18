import type { AudioClock } from './AudioClock';
import type { ScheduledClip } from './Transport';

/** Decodes audio blobs and schedules AudioBufferSourceNodes for playback. */
export class ClipPlayer {
  private context: AudioContext;
  private clock: AudioClock;
  private decodedBuffers = new Map<string, AudioBuffer>();
  private activeNodes = new Map<string, AudioBufferSourceNode>();

  constructor(context: AudioContext, clock: AudioClock) {
    this.context = context;
    this.clock = clock;
  }

  /** Decode an audio blob and cache the resulting AudioBuffer. */
  async decodeBlob(blobId: string, blob: Blob): Promise<AudioBuffer> {
    const existing = this.decodedBuffers.get(blobId);
    if (existing) return existing;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.decodedBuffers.set(blobId, audioBuffer);
    return audioBuffer;
  }

  /** Get a decoded buffer, or null if not yet decoded. */
  getBuffer(blobId: string): AudioBuffer | null {
    return this.decodedBuffers.get(blobId) ?? null;
  }

  /** Schedule a clip for playback at the given context time. */
  scheduleClip(
    clip: ScheduledClip,
    destination: AudioNode,
    contextStartTime: number,
  ): void {
    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;

    const gain = this.context.createGain();
    gain.gain.value = Math.pow(10, clip.gainDb / 20);

    source.connect(gain);
    gain.connect(destination);

    const offsetSeconds = this.clock.beatsToSeconds(clip.offsetBeats);
    const durationSeconds = this.clock.beatsToSeconds(clip.durationBeats);

    source.start(contextStartTime, offsetSeconds, durationSeconds);
    this.activeNodes.set(clip.clipId, source);

    source.onended = () => {
      this.activeNodes.delete(clip.clipId);
      gain.disconnect();
    };
  }

  /** Stop all playing clips. */
  stopAll(): void {
    for (const [id, node] of this.activeNodes) {
      node.stop();
      this.activeNodes.delete(id);
    }
  }

  /** Clear decoded buffer cache. */
  clearCache(): void {
    this.decodedBuffers.clear();
  }
}
