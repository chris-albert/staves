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
          if (handlers.isPlaying) {
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
