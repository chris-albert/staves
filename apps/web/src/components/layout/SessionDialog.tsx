import { useState } from 'react';
import { Dialog } from '@staves/ui';

interface SessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateSession: () => void;
  onJoinSession: (roomId: string) => void;
  currentRoomId: string | null;
}

export function SessionDialog({ open, onClose, onCreateSession, onJoinSession, currentRoomId }: SessionDialogProps) {
  const [joinId, setJoinId] = useState('');

  return (
    <Dialog open={open} onClose={onClose} title="Collaboration">
      <div className="flex flex-col gap-6">
        {currentRoomId ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Session active</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-300">{currentRoomId}</code>
              <button
                onClick={() => navigator.clipboard.writeText(currentRoomId)}
                className="rounded bg-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Start a session</span>
              <p className="text-xs text-zinc-400">Create a room and share the ID with your collaborator.</p>
              <button
                onClick={() => {
                  onCreateSession();
                  onClose();
                }}
                className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                Create Session
              </button>
            </div>

            <div className="border-t border-zinc-800" />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Join a session</span>
              <p className="text-xs text-zinc-400">Paste the room ID shared by your collaborator.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="Room ID"
                  className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
                />
                <button
                  onClick={() => {
                    if (joinId.trim()) {
                      onJoinSession(joinId.trim());
                      onClose();
                    }
                  }}
                  className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
