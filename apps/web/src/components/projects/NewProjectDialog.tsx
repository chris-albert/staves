import { useState } from 'react';
import { Dialog } from '@staves/ui';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, bpm: number) => void;
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [bpm, setBpm] = useState('120');

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
    <Dialog open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-400">Project Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Song"
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-400">BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            min="20"
            max="300"
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
}
