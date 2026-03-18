import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncProvider, projectSync, awarenessSync } from '@staves/sync';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Manages real-time collaboration for a project.
 * Creates a SyncProvider (Yjs + WebRTC) and binds it to the project store.
 */
export function useSync(roomId: string | null) {
  const providerRef = useRef<SyncProvider | null>(null);
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
    const unsubSync = projectSync(
      provider.doc,
      useProjectStore.getState,
      (listener) => useProjectStore.subscribe(listener),
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

    // Mark as connected after a short delay (signaling takes a moment)
    const timer = setTimeout(() => {
      if (provider.connected) setStatus('connected');
    }, 2000);

    return () => {
      clearTimeout(timer);
      unsubSync();
      unsubAwareness();
      provider.destroy();
      providerRef.current = null;
      setStatus('disconnected');
      setPeerCount(0);
    };
  }, [roomId]);

  const getProvider = useCallback(() => providerRef.current, []);

  return { status, peerCount, getProvider };
}
