import { useState, useEffect, useRef } from 'react';

interface JoinSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onJoin: (roomId: string) => void;
}

export function JoinSessionDialog({ open, onClose, onJoin }: JoinSessionDialogProps) {
  const [roomId, setRoomId] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) return;
    onJoin(trimmed);
    setRoomId('');
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-[280px] w-[480px] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/60"
    >
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Join Session</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Enter a room ID to collaborate with another musician.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center gap-6 p-6">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-200">Room ID</div>
              <div className="mt-0.5 text-xs text-zinc-500">Paste the ID shared by your collaborator</div>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Paste room ID"
              className="w-56 flex-shrink-0 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:ring-zinc-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!roomId.trim()}
            className="rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Join Session
          </button>
        </div>
      </form>
    </dialog>
  );
}
