/**
 * Loads drum samples and schedules one-shot playback via AudioBufferSourceNode.
 * Analogous to ClipPlayer but optimized for short one-shot samples.
 */
export class DrumSampler {
  private context: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer>>();

  constructor(context: AudioContext) {
    this.context = context;
  }

  /** Load a sample from a URL and cache the decoded AudioBuffer. */
  async loadSample(url: string): Promise<AudioBuffer> {
    const existing = this.buffers.get(url);
    if (existing) return existing;

    const inFlight = this.loadingPromises.get(url);
    if (inFlight) return inFlight;

    const promise = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((ab) => this.context.decodeAudioData(ab))
      .then((buf) => {
        this.buffers.set(url, buf);
        this.loadingPromises.delete(url);
        return buf;
      });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /** Cache an already-decoded buffer (e.g. from audioBlobStore). */
  cacheBuffer(key: string, buffer: AudioBuffer): void {
    this.buffers.set(key, buffer);
  }

  getBuffer(key: string): AudioBuffer | undefined {
    return this.buffers.get(key);
  }

  /**
   * Schedule a single drum hit at a specific AudioContext time.
   * Creates a short-lived AudioBufferSourceNode → GainNode → destination.
   */
  scheduleHit(
    sampleKey: string,
    destination: AudioNode,
    contextTime: number,
    velocity = 1,
  ): void {
    const buffer = this.buffers.get(sampleKey);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = velocity;

    source.connect(gain);
    gain.connect(destination);
    source.start(contextTime);

    source.onended = () => {
      gain.disconnect();
    };
  }

  clearCache(): void {
    this.buffers.clear();
    this.loadingPromises.clear();
  }
}
