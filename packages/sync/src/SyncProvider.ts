import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface SyncProviderOptions {
  roomId: string;
  signalingServers?: string[];
  onPeerConnect?: () => void;
  onPeerDisconnect?: () => void;
}

/** Manages a Yjs document and y-webrtc provider for real-time collaboration. */
export class SyncProvider {
  readonly doc: Y.Doc;
  readonly provider: WebrtcProvider;
  readonly awareness: WebrtcProvider['awareness'];
  private _roomId: string;

  constructor(options: SyncProviderOptions) {
    this._roomId = options.roomId;
    this.doc = new Y.Doc();

    const signalingServers = options.signalingServers ?? [
      'wss://staves-signaling.chris-25c.workers.dev',
    ];

    this.provider = new WebrtcProvider(options.roomId, this.doc, {
      signaling: signalingServers,
    });

    this.awareness = this.provider.awareness;

    if (options.onPeerConnect) {
      this.provider.on('peers', options.onPeerConnect);
    }
    if (options.onPeerDisconnect) {
      this.provider.on('peers', options.onPeerDisconnect);
    }
  }

  get roomId(): string {
    return this._roomId;
  }

  get connected(): boolean {
    return this.provider.connected;
  }

  get peerCount(): number {
    return this.awareness.getStates().size - 1;
  }

  destroy(): void {
    this.provider.disconnect();
    this.provider.destroy();
    this.doc.destroy();
  }
}
