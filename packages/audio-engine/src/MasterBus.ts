/** Master output bus: GainNode → AnalyserNode → destination. */
export class MasterBus {
  readonly gainNode: GainNode;
  readonly analyser: AnalyserNode;

  constructor(context: AudioContext) {
    this.gainNode = context.createGain();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;

    this.gainNode.connect(this.analyser);
    this.analyser.connect(context.destination);
  }

  get volume(): number {
    return this.gainNode.gain.value;
  }

  set volume(v: number) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  /** Returns current RMS level (0–1). */
  getLevel(): number {
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i]! * data[i]!;
    }
    return Math.sqrt(sum / data.length);
  }

  /** Returns the analyser's input node (other nodes connect here). */
  get input(): GainNode {
    return this.gainNode;
  }
}
