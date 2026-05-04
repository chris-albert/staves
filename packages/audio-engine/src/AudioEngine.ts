import { MasterBus } from './MasterBus';
import { Transport } from './Transport';
import { TempoMap } from './TempoMap';
import { Metronome } from './Metronome';
import { ClipPlayer } from './ClipPlayer';
import { DrumSampler } from './DrumSampler';
import { Synth } from './Synth';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  readonly context: AudioContext;
  readonly masterBus: MasterBus;
  readonly transport: Transport;
  tempoMap: TempoMap;
  readonly metronome: Metronome;
  readonly clipPlayer: ClipPlayer;
  readonly drumSampler: DrumSampler;
  readonly synth: Synth;

  private constructor() {
    this.context = new AudioContext({ sampleRate: 48000 });
    this.tempoMap = new TempoMap();
    this.masterBus = new MasterBus(this.context);
    this.metronome = new Metronome(this.context, this.masterBus.input);
    this.clipPlayer = new ClipPlayer(this.context, this.tempoMap);
    this.drumSampler = new DrumSampler(this.context);
    this.synth = new Synth(this.context);
    this.transport = new Transport(this.context, this.tempoMap, this.metronome);
  }

  /** Replace the tempo map (e.g. when loading a project or syncing). */
  setTempoMap(tempoMap: TempoMap): void {
    this.tempoMap = tempoMap;
    this.transport.setTempoMap(tempoMap);
    this.clipPlayer.setTempoMap(tempoMap);
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
      try {
        await ctx.setSinkId(deviceId);
      } catch {
        // Context may be closing or device unavailable
      }
    }
  }

  destroy(): void {
    this.transport.stop();
    this.synth.releaseAll();
    this.clipPlayer.stopAll();
    this.clipPlayer.clearCache();
    this.drumSampler.clearCache();
    this.context.close();
    AudioEngine.instance = null;
  }
}
