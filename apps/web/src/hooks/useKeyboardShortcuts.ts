import { useEffect } from 'react';

interface ShortcutHandlers {
  onPlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
  onRecord: () => void;
  onStopRecord: () => void;
  isRecording: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onAddMarker: () => void;
  onLoopSection: () => void;
}

/**
 * Global keyboard shortcuts for the DAW editor.
 *
 * Space       — play/stop
 * R           — record/stop recording
 * Backspace   — delete selected clips
 * Delete      — delete selected clips
 * Cmd/Ctrl+Z  — undo
 * Cmd/Ctrl+Shift+Z — redo
 * Cmd/Ctrl+A  — select all
 * Cmd/Ctrl+=  — zoom in
 * Cmd/Ctrl+-  — zoom out
 * S           — split selected clips at playhead
 * Cmd/Ctrl+D  — duplicate selected clips
 * Cmd/Ctrl+L  — loop selected clips (set loop region)
 * M           — add marker at playhead
 * Escape      — deselect all
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't capture shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const mod = e.metaKey || e.ctrlKey;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (handlers.isRecording) {
            handlers.onStopRecord();
          } else if (handlers.isPlaying) {
            handlers.onStop();
          } else {
            handlers.onPlay();
          }
          break;

        case 'KeyR':
          if (!mod) {
            e.preventDefault();
            if (handlers.isRecording) {
              handlers.onStopRecord();
            } else {
              handlers.onRecord();
            }
          }
          break;

        case 'Backspace':
        case 'Delete':
          if (!mod) {
            e.preventDefault();
            handlers.onDelete();
          }
          break;

        case 'KeyZ':
          if (mod) {
            e.preventDefault();
            if (e.shiftKey) {
              handlers.onRedo();
            } else {
              handlers.onUndo();
            }
          }
          break;

        case 'KeyA':
          if (mod) {
            e.preventDefault();
            handlers.onSelectAll();
          }
          break;

        case 'Equal':
          if (mod) {
            e.preventDefault();
            handlers.onZoomIn();
          }
          break;

        case 'Minus':
          if (mod) {
            e.preventDefault();
            handlers.onZoomOut();
          }
          break;

        case 'KeyC':
          if (mod) {
            e.preventDefault();
            handlers.onCopy();
          }
          break;

        case 'KeyV':
          if (mod) {
            e.preventDefault();
            handlers.onPaste();
          }
          break;

        case 'KeyS':
          if (!mod) {
            e.preventDefault();
            handlers.onSplit();
          }
          break;

        case 'KeyD':
          if (mod) {
            e.preventDefault();
            handlers.onDuplicate();
          }
          break;

        case 'KeyL':
          if (mod) {
            e.preventDefault();
            handlers.onLoopSection();
          }
          break;

        case 'KeyM':
          if (!mod) {
            e.preventDefault();
            handlers.onAddMarker();
          }
          break;

        case 'Escape':
          e.preventDefault();
          handlers.onDeselectAll();
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
