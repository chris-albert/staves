import type { Project } from '@staves/storage';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
  const date = new Date(project.updatedAt);
  const relative = formatRelativeDate(date);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-4 hover:border-zinc-700 hover:bg-zinc-900 transition-all"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[15px] font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
          {project.name}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-700 opacity-0 hover:bg-zinc-800 hover:text-zinc-400 group-hover:opacity-100 transition-all"
          title="Delete project"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 3h8M4.5 3V2h3v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
          {project.bpm} bpm
        </span>
        <span>{project.timeSignatureNumerator}/{project.timeSignatureDenominator}</span>
        <span className="text-zinc-700">-</span>
        <span>{relative}</span>
      </div>
    </div>
  );
}

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
