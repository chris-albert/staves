import { MasterBus } from './MasterBus';
import { Transport } from './Transport';
import { AudioClock } from './AudioClock';
import { Metronome } from './Metronome';
import { ClipPlayer } from './ClipPlayer';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  readonly context: AudioContext;
  readonly masterBus: MasterBus;
  readonly transport: Transport;
  readonly clock: AudioClock;
  readonly metronome: Metronome;
  readonly clipPlayer: ClipPlayer;

  private constructor() {
    this.context = new AudioContext({ sampleRate: 48000 });
    this.clock = new AudioClock(120, 4, 4);
    this.masterBus = new MasterBus(this.context);
    this.metronome = new Metronome(this.context, this.clock, this.masterBus.input);
    this.clipPlayer = new ClipPlayer(this.context, this.clock);
    this.transport = new Transport(this.context, this.clock, this.metronome);
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  async init(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /** Set the output audio device. Requires browser support for AudioContext.setSinkId. */
  async setOutputDevice(deviceId: string): Promise<void> {
    const ctx = this.context as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    if (typeof ctx.setSinkId === 'function') {
      await ctx.setSinkId(deviceId);
    }
  }

  destroy(): void {
    this.transport.stop();
    this.clipPlayer.stopAll();
    this.clipPlayer.clearCache();
    this.context.close();
    AudioEngine.instance = null;
  }
}
