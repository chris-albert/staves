/** Per-track audio graph: input → GainNode → StereoPannerNode → Splitter → [AnalyserL, AnalyserR] → output. */
export class TrackNode {
  readonly gainNode: GainNode;
  readonly panNode: StereoPannerNode;
  private readonly splitter: ChannelSplitterNode;
  private readonly analyserL: AnalyserNode;
  private readonly analyserR: AnalyserNode;
  private _isMuted = false;
  private _storedGain = 1;

  constructor(context: AudioContext, destination: AudioNode) {
    this.gainNode = context.createGain();
    this.panNode = context.createStereoPanner();
    this.splitter = context.createChannelSplitter(2);
    this.analyserL = context.createAnalyser();
    this.analyserR = context.createAnalyser();
    this.analyserL.fftSize = 256;
    this.analyserR.fftSize = 256;

    this.gainNode.connect(this.panNode);
    this.panNode.connect(destination);
    // Tap into the signal for metering without affecting the output
    this.panNode.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
  }

  get volume(): number {
    return this._isMuted ? this._storedGain : this.gainNode.gain.value;
  }

  set volume(v: number) {
    this._storedGain = v;
    if (!this._isMuted) {
      this.gainNode.gain.value = v;
    }
  }

  get pan(): number {
    return this.panNode.pan.value;
  }

  set pan(v: number) {
    this.panNode.pan.value = Math.max(-1, Math.min(1, v));
  }

  get muted(): boolean {
    return this._isMuted;
  }

  set muted(m: boolean) {
    this._isMuted = m;
    this.gainNode.gain.value = m ? 0 : this._storedGain;
  }

  /** Returns stereo RMS levels [left, right], each 0–1. */
  getStereoLevel(): [number, number] {
    return [rms(this.analyserL), rms(this.analyserR)];
  }

  /** Returns the gain node as the input for connecting source nodes. */
  get input(): GainNode {
    return this.gainNode;
  }

  disconnect(): void {
    this.analyserL.disconnect();
    this.analyserR.disconnect();
    this.splitter.disconnect();
    this.panNode.disconnect();
    this.gainNode.disconnect();
  }
}

function rms(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i]! * data[i]!;
  }
  return Math.sqrt(sum / data.length);
}
