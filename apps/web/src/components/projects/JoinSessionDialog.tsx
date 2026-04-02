import { useState } from 'react';
import { Dialog } from '@staves/ui';

interface JoinSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onJoin: (roomId: string) => void;
}

export function JoinSessionDialog({ open, onClose, onJoin }: JoinSessionDialogProps) {
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) return;
    onJoin(trimmed);
    setRoomId('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Join Session">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-400">Room ID</span>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Paste the room ID from your collaborator"
            className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
            autoFocus
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
            disabled={!roomId.trim()}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Join
          </button>
        </div>
      </form>
    </Dialog>
  );
}
