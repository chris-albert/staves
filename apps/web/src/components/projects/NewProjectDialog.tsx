import { useState, useEffect, useRef } from 'react';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, bpm: number) => void;
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [bpm, setBpm] = useState('120');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setTimeout(() => nameInputRef.current?.focus(), 0);
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
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedBpm = parseInt(bpm, 10);
    onCreate(trimmed, isNaN(parsedBpm) ? 120 : parsedBpm);
    setName('');
    setBpm('120');
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-[320px] w-[480px] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/60"
    >
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">New Project</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Create a new music project to start working on.</p>
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
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-200">Project Name</div>
              <div className="mt-0.5 text-xs text-zinc-500">A name for your new project</div>
            </div>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Song"
              className="w-56 flex-shrink-0 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:ring-zinc-500"
            />
          </div>

          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-200">Tempo (BPM)</div>
              <div className="mt-0.5 text-xs text-zinc-500">Beats per minute (20–300)</div>
            </div>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              min="20"
              max="300"
              className="w-24 flex-shrink-0 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:ring-zinc-500"
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
            disabled={!name.trim()}
            className="rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create Project
          </button>
        </div>
      </form>
    </dialog>
  );
}
