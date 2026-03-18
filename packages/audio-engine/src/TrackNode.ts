/** Per-track audio graph: input → GainNode → StereoPannerNode → output. */
export class TrackNode {
  readonly gainNode: GainNode;
  readonly panNode: StereoPannerNode;
  private _isMuted = false;
  private _storedGain = 1;

  constructor(context: AudioContext, destination: AudioNode) {
    this.gainNode = context.createGain();
    this.panNode = context.createStereoPanner();

    this.gainNode.connect(this.panNode);
    this.panNode.connect(destination);
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

  /** Returns the gain node as the input for connecting source nodes. */
  get input(): GainNode {
    return this.gainNode;
  }

  disconnect(): void {
    this.panNode.disconnect();
    this.gainNode.disconnect();
  }
}
