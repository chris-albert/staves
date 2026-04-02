/** Generates metronome clicks using OscillatorNode. */
export class Metronome {
  private context: AudioContext;
  private _enabled = false;
  private gainNode: GainNode;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.gainNode = context.createGain();
    this.gainNode.gain.value = 0.5;
    this.gainNode.connect(destination);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(v: boolean) {
    this._enabled = v;
  }

  /** Schedule a click at the given context time. isDownbeat plays a higher pitch. */
  scheduleClick(time: number, isDownbeat: boolean): void {
    if (!this._enabled) return;

    const osc = this.context.createOscillator();
    const env = this.context.createGain();

    osc.frequency.value = isDownbeat ? 1000 : 800;
    osc.connect(env);
    env.connect(this.gainNode);

    env.gain.setValueAtTime(1, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  get volume(): number {
    return this.gainNode.gain.value;
  }

  set volume(v: number) {
    this.gainNode.gain.value = v;
  }
}
