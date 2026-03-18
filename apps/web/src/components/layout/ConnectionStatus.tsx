import type { ConnectionStatus as Status } from '@/hooks/useSync';

interface ConnectionStatusProps {
  status: Status;
  peerCount: number;
  roomId: string | null;
  onShare: () => void;
}

const statusConfig = {
  disconnected: { color: 'bg-zinc-600', label: 'Offline' },
  connecting: { color: 'bg-amber-500 animate-pulse', label: 'Connecting' },
  connected: { color: 'bg-emerald-500', label: 'Connected' },
} as const;

export function ConnectionStatus({ status, peerCount, roomId, onShare }: ConnectionStatusProps) {
  if (!roomId && status === 'disconnected') return null;

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.color}`} />
      <span className="text-[11px] text-zinc-500">
        {config.label}
        {status === 'connected' && peerCount > 0 && ` (${peerCount})`}
      </span>
      {roomId && (
        <button
          onClick={onShare}
          className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Copy room ID"
        >
          Copy ID
        </button>
      )}
    </div>
  );
}
