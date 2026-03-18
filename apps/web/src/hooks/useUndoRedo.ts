import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { SyncProvider } from '@staves/sync';
import { commandHistory } from '@/lib/commands';

/**
 * Provides undo/redo that is CRDT-aware when a sync provider is available,
 * falling back to the local command history when offline.
 */
export function useUndoRedo(getProvider: () => SyncProvider | null) {
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const doc = provider.doc;
    const trackedTypes = [
      doc.getMap('project'),
      doc.getArray('tracks'),
      doc.getArray('clips'),
    ];

    const undoManager = new Y.UndoManager(trackedTypes, {
      captureTimeout: 500,
    });

    undoManagerRef.current = undoManager;

    return () => {
      undoManager.destroy();
      undoManagerRef.current = null;
    };
  }, [getProvider]);

  const undo = useCallback(() => {
    const um = undoManagerRef.current;
    if (um && um.canUndo()) {
      um.undo();
    } else {
      commandHistory.undo();
    }
  }, []);

  const redo = useCallback(() => {
    const um = undoManagerRef.current;
    if (um && um.canRedo()) {
      um.redo();
    } else {
      commandHistory.redo();
    }
  }, []);

  return { undo, redo };
}
