import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncProvider, projectSync, transportSync, awarenessSync, BlobTransferService } from '@staves/sync';
import { audioBlobStore } from '@staves/storage';
import { AudioEngine } from '@staves/audio-engine';
import { useProjectStore } from '@/stores/projectStore';
import { useTransportStore } from '@/stores/transportStore';
import { useUiStore } from '@/stores/uiStore';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Manages real-time collaboration for a project.
 * Creates a SyncProvider (Yjs + WebRTC) and binds it to the project store.
 * Handles transport sync and audio blob transfer between peers.
 */
export function useSync(roomId: string | null, isJoining = false) {
  const providerRef = useRef<SyncProvider | null>(null);
  const blobTransferRef = useRef<BlobTransferService | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [peerCount, setPeerCount] = useState(0);

  // Connect to a room
  useEffect(() => {
    if (!roomId) return;

    setStatus('connecting');

    const provider = new SyncProvider({
      roomId,
      onPeerConnect: () => {
        setStatus('connected');
        setPeerCount(provider.peerCount);
      },
      onPeerDisconnect: () => {
        setPeerCount(provider.peerCount);
        if (provider.peerCount === 0) {
          setStatus('connecting');
        }
      },
    });

    providerRef.current = provider;

    // Bidirectional sync between Yjs doc and project store
    const unsubProjectSync = projectSync(
      provider.doc,
      useProjectStore.getState,
      (listener) => useProjectStore.subscribe(listener),
      { isJoining, provider: provider.provider },
    );

    // Transport sync — remote play/stop/record commands
    const unsubTransportSync = transportSync(
      provider.doc,
      useTransportStore.getState,
      (listener) => useTransportStore.subscribe(listener),
      {
        onRemotePlay: (startBeat) => {
          try {
            const engine = AudioEngine.getInstance();
            engine.init().then(() => {
              engine.transport.seek(startBeat);
              engine.transport.play();
            });
          } catch { /* engine not ready */ }
        },
        onRemoteStop: () => {
          try {
            const engine = AudioEngine.getInstance();
            engine.transport.stop();
          } catch { /* engine not ready */ }
        },
        onRemoteRecord: (startBeat) => {
          // Remote peer is recording — we just play along
          try {
            const engine = AudioEngine.getInstance();
            engine.init().then(() => {
              engine.transport.seek(startBeat);
              engine.transport.play();
            });
          } catch { /* engine not ready */ }
        },
      },
    );

    // Initialize local awareness
    awarenessSync.initLocal(provider.awareness, `Peer ${provider.awareness.getStates().size}`);

    // Subscribe to peer awareness changes → update UI store
    const unsubAwareness = awarenessSync.onPeersChange(provider.awareness, (peers) => {
      setPeerCount(peers.length);
      useUiStore.getState().setPeerCursors(
        peers.map((p) => ({
          clientId: p.clientId,
          name: p.name,
          color: p.color,
          beat: p.cursorBeat,
        })),
      );
    });

    // Audio blob transfer service
    const blobTransfer = new BlobTransferService({
      provider: provider.provider,
      onBlobReceived: async (blobId, result) => {
        const projectId = useProjectStore.getState().project?.id;
        if (!projectId) return;
        await audioBlobStore.storeWithId(
          blobId,
          result.projectId || projectId,
          result.data,
          result.format,
          result.sampleRate,
          result.durationSeconds,
        );
        // Re-trigger clip rebuild so the audio becomes playable
        const clips = useProjectStore.getState().clips;
        useProjectStore.getState().setClips([...clips]);
      },
      localBlobIds: async () => {
        const projectId = useProjectStore.getState().project?.id;
        if (!projectId) return [];
        const blobs = await audioBlobStore.getForProject(projectId);
        return blobs.map((b) => b.id);
      },
      getBlob: async (id) => {
        const blob = await audioBlobStore.get(id);
        if (!blob) return undefined;
        return {
          data: blob.data,
          format: blob.format,
          sampleRate: blob.sampleRate,
          durationSeconds: blob.durationSeconds,
          projectId: blob.projectId,
        };
      },
    });
    blobTransferRef.current = blobTransfer;

    // Mark as connected after a short delay (signaling takes a moment)
    const timer = setTimeout(() => {
      if (provider.connected) setStatus('connected');
    }, 2000);

    return () => {
      clearTimeout(timer);
      unsubProjectSync();
      unsubTransportSync();
      unsubAwareness();
      blobTransfer.destroy();
      blobTransferRef.current = null;
      provider.destroy();
      providerRef.current = null;
      setStatus('disconnected');
      setPeerCount(0);
    };
  }, [roomId, isJoining]);

  const getProvider = useCallback(() => providerRef.current, []);
  const getBlobTransfer = useCallback(() => blobTransferRef.current, []);

  return { status, peerCount, getProvider, getBlobTransfer };
}
