import type { TempoMap } from './TempoMap';
import type { ScheduledClip } from './Transport';

/** Decodes audio blobs and schedules AudioBufferSourceNodes for playback. */
export class ClipPlayer {
  private context: AudioContext;
  private tempoMap: TempoMap;
  private decodedBuffers = new Map<string, AudioBuffer>();
  private activeNodes = new Map<string, AudioBufferSourceNode>();

  constructor(context: AudioContext, tempoMap: TempoMap) {
    this.context = context;
    this.tempoMap = tempoMap;
  }

  setTempoMap(tempoMap: TempoMap): void {
    this.tempoMap = tempoMap;
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
    const clipGainValue = Math.pow(10, clip.gainDb / 20);

    // Audio buffers don't time-stretch — use the tempo at the clip's
    // start position to convert beat-based offset/duration to seconds.
    const tempoAtClip = this.tempoMap.tempoAtBeat(clip.startBeat);
    const offsetSeconds = clip.offsetBeats * 60 / tempoAtClip;
    const durationSeconds = clip.durationBeats * 60 / tempoAtClip;
    const fadeInSeconds = clip.fadeInBeats * 60 / tempoAtClip;
    const fadeOutSeconds = clip.fadeOutBeats * 60 / tempoAtClip;

    // Apply fade envelope
    if (fadeInSeconds > 0) {
      gain.gain.setValueAtTime(0, contextStartTime);
      gain.gain.linearRampToValueAtTime(clipGainValue, contextStartTime + fadeInSeconds);
    } else {
      gain.gain.setValueAtTime(clipGainValue, contextStartTime);
    }

    if (fadeOutSeconds > 0) {
      const fadeOutStart = contextStartTime + durationSeconds - fadeOutSeconds;
      gain.gain.setValueAtTime(clipGainValue, Math.max(contextStartTime, fadeOutStart));
      gain.gain.linearRampToValueAtTime(0, contextStartTime + durationSeconds);
    }

    source.connect(gain);
    gain.connect(destination);

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
