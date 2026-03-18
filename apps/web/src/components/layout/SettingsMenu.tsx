import { useState, useRef, useEffect } from 'react';

type Tab = 'audio' | 'collaborate' | 'file';

interface SettingsMenuProps {
  onOpenPreferences: (tab: Tab) => void;
}

export function SettingsMenu({ onOpenPreferences }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function openTab(tab: Tab) {
    onOpenPreferences(tab);
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
          open ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
        title="Preferences"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-zinc-700/80 bg-zinc-900 py-1 shadow-2xl">
          <MenuItem icon={<AudioIcon />} label="Audio Settings" onClick={() => openTab('audio')} />
          <MenuItem icon={<LinkIcon />} label="Collaborate" onClick={() => openTab('collaborate')} />
          <div className="mx-2 my-1 border-t border-zinc-800" />
          <MenuItem icon={<FileIcon />} label="Export / Import" onClick={() => openTab('file')} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
    >
      <span className="flex-shrink-0 text-zinc-500">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function AudioIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M7 2v10M4 4.5v5M10 4.5v5M1 6v2M13 6v2" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M6 8l2-2" />
      <path d="M4.5 9.5a2.5 2.5 0 010-3.5L6 4.5a2.5 2.5 0 013.5 0" />
      <path d="M9.5 4.5a2.5 2.5 0 010 3.5L8 9.5a2.5 2.5 0 01-3.5 0" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 1h5l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" />
      <path d="M8 1v3h3" />
    </svg>
  );
}
