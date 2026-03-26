/** Master output bus: GainNode → PannerNode → destination, with stereo metering tap. */
export class MasterBus {
  readonly gainNode: GainNode;
  readonly panNode: StereoPannerNode;
  private readonly splitter: ChannelSplitterNode;
  private readonly analyserL: AnalyserNode;
  private readonly analyserR: AnalyserNode;

  constructor(context: AudioContext) {
    this.gainNode = context.createGain();
    this.panNode = context.createStereoPanner();
    this.splitter = context.createChannelSplitter(2);
    this.analyserL = context.createAnalyser();
    this.analyserR = context.createAnalyser();
    this.analyserL.fftSize = 256;
    this.analyserR.fftSize = 256;

    this.gainNode.connect(this.panNode);
    this.panNode.connect(context.destination);
    // Tap for stereo metering
    this.panNode.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
  }

  get volume(): number {
    return this.gainNode.gain.value;
  }

  set volume(v: number) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  get pan(): number {
    return this.panNode.pan.value;
  }

  set pan(v: number) {
    this.panNode.pan.value = Math.max(-1, Math.min(1, v));
  }

  /** Returns stereo RMS levels [left, right], each 0–1. */
  getStereoLevel(): [number, number] {
    return [rms(this.analyserL), rms(this.analyserR)];
  }

  /** Returns the analyser's input node (other nodes connect here). */
  get input(): GainNode {
    return this.gainNode;
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
