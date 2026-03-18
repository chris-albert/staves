import { TransportBar } from '../transport/TransportBar';

interface ToolbarProps {
  projectName: string;
  isRecording: boolean;
  hasArmedTrack: boolean;
  onRecord: () => void;
  onStopRecord: () => void;
  onOpenPreferences: () => void;
  onNavigateHome: () => void;
}

export function Toolbar({
  projectName,
  isRecording,
  hasArmedTrack,
  onRecord,
  onStopRecord,
  onOpenPreferences,
  onNavigateHome,
}: ToolbarProps) {
  return (
    <div className="relative z-20 flex h-11 items-center border-b border-zinc-800 bg-zinc-900 px-3 gap-3">
      {/* Left: back + project name */}
      <div className="flex items-center gap-2 min-w-0 w-56 flex-shrink-0">
        <button
          onClick={onNavigateHome}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Back to projects"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2L4 7l5 5" />
          </svg>
        </button>
        <span className="truncate text-sm font-medium text-zinc-300">{projectName}</span>
      </div>

      {/* Center: transport */}
      <div className="flex flex-1 items-center justify-center">
        <TransportBar
          isRecording={isRecording}
          hasArmedTrack={hasArmedTrack}
          onRecord={onRecord}
          onStopRecord={onStopRecord}
        />
      </div>

      {/* Right: settings gear */}
      <div className="flex items-center w-56 flex-shrink-0 justify-end">
        <button
          onClick={onOpenPreferences}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Preferences"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
          </svg>
        </button>
      </div>
    </div>
  );
}
