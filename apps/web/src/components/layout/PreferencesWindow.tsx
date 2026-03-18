import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { exportProject, importProject } from '@staves/storage';
import type { AudioDevice } from '@/hooks/useAudioDevices';

type Tab = 'audio' | 'collaborate' | 'file';

interface PreferencesWindowProps {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
  // Audio
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  selectedInputId: string;
  selectedOutputId: string;
  onSelectInput: (deviceId: string) => void;
  onSelectOutput: (deviceId: string) => void;
  permissionGranted: boolean;
  onRequestPermission: () => void;
  // Collaborate
  currentRoomId: string | null;
  onCreateSession: () => void;
  onJoinSession: (roomId: string) => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  peerCount: number;
  // File
  projectId: string | null;
  projectName: string;
  onImported: (projectId: string) => void;
}

export function PreferencesWindow(props: PreferencesWindowProps) {
  const { open, onClose, initialTab = 'audio' } = props;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync initialTab when opening
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Close on Escape
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'audio', label: 'Audio', icon: <AudioIcon /> },
    { id: 'collaborate', label: 'Link / Collaborate', icon: <LinkIcon /> },
    { id: 'file', label: 'File / Export', icon: <FileIcon /> },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-[480px] w-[680px] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="flex w-48 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/80">
          <div className="px-4 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Preferences</h2>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-zinc-300' : 'text-zinc-600'}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="border-t border-zinc-800 p-3">
            <button
              onClick={onClose}
              className="w-full rounded-md bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'audio' && <AudioTab {...props} />}
          {activeTab === 'collaborate' && <CollaborateTab {...props} />}
          {activeTab === 'file' && <FileTab {...props} />}
        </div>
      </div>
    </dialog>
  );
}

// ─── Audio Tab ──────────────────────────────────────────────────────────

function AudioTab({
  inputs, outputs, selectedInputId, selectedOutputId,
  onSelectInput, onSelectOutput, permissionGranted, onRequestPermission,
}: PreferencesWindowProps) {
  useEffect(() => {
    if (!selectedOutputId) return;
    try {
      const engine = AudioEngine.getInstance();
      engine.setOutputDevice(selectedOutputId);
    } catch { /* not ready */ }
  }, [selectedOutputId]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title="Audio" description="Configure your input and output devices." />

      {!permissionGranted && (
        <div className="flex items-center gap-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-200">Microphone access required</p>
            <p className="mt-0.5 text-xs text-amber-200/60">Grant access to see device names and enable recording.</p>
          </div>
          <button
            onClick={onRequestPermission}
            className="flex-shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
          >
            Allow Access
          </button>
        </div>
      )}

      <SettingsRow label="Audio Input" description="Microphone or audio interface input">
        <DeviceSelect
          devices={inputs}
          value={selectedInputId}
          onChange={onSelectInput}
          emptyLabel="No input devices found"
        />
      </SettingsRow>

      <SettingsRow label="Audio Output" description="Speakers or headphone output">
        <DeviceSelect
          devices={outputs}
          value={selectedOutputId}
          onChange={onSelectOutput}
          emptyLabel="No output devices found"
        />
      </SettingsRow>

      <SettingsRow label="Sample Rate" description="Audio engine sample rate">
        <span className="text-sm text-zinc-400">48000 Hz</span>
      </SettingsRow>
    </div>
  );
}

// ─── Collaborate Tab ────────────────────────────────────────────────────

function CollaborateTab({
  currentRoomId, onCreateSession, onJoinSession,
  connectionStatus, peerCount,
}: PreferencesWindowProps) {
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!currentRoomId) return;
    navigator.clipboard.writeText(currentRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = {
    disconnected: 'bg-zinc-600',
    connecting: 'bg-amber-500 animate-pulse',
    connected: 'bg-emerald-500',
  }[connectionStatus];

  const statusLabel = {
    disconnected: 'Not connected',
    connecting: 'Connecting...',
    connected: `Connected${peerCount > 0 ? ` — ${peerCount} peer${peerCount > 1 ? 's' : ''}` : ''}`,
  }[connectionStatus];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title="Link / Collaborate" description="Work on a project with another musician in real-time." />

      {/* Status */}
      <SettingsRow label="Status" description="Current collaboration session">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-sm text-zinc-300">{statusLabel}</span>
        </div>
      </SettingsRow>

      {currentRoomId ? (
        <SettingsRow label="Room ID" description="Share this with your collaborator">
          <div className="flex items-center gap-2">
            <code className="rounded bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-zinc-300">
              {currentRoomId.slice(0, 8)}...{currentRoomId.slice(-4)}
            </code>
            <button
              onClick={handleCopy}
              className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </SettingsRow>
      ) : (
        <>
          <SettingsRow label="Start Session" description="Create a new room for real-time collaboration">
            <button
              onClick={onCreateSession}
              className="rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white transition-colors"
            >
              Create Room
            </button>
          </SettingsRow>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <SettingsRow label="Join Session" description="Enter a room ID to join an existing session">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste room ID"
                className="w-48 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none ring-1 ring-zinc-700 placeholder:text-zinc-600 focus:ring-zinc-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinId.trim()) onJoinSession(joinId.trim());
                }}
              />
              <button
                onClick={() => { if (joinId.trim()) onJoinSession(joinId.trim()); }}
                disabled={!joinId.trim()}
                className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Join
              </button>
            </div>
          </SettingsRow>
        </>
      )}
    </div>
  );
}

// ─── File Tab ───────────────────────────────────────────────────────────

function FileTab({ projectId, projectName, onImported, onClose }: PreferencesWindowProps) {
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!projectId) return;
    try {
      setStatus('Exporting...');
      const blob = await exportProject(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'project'}.staves`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Exported successfully');
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setStatus('Importing...');
      const id = await importProject(file);
      setStatus('Imported successfully');
      onImported(id);
      setTimeout(() => { setStatus(null); onClose(); }, 1500);
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title="File / Export" description="Export your project as a backup or import an existing one." />

      {projectId && (
        <SettingsRow label="Export Project" description="Download as a .staves file including all audio">
          <button
            onClick={handleExport}
            className="rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            Export .staves
          </button>
        </SettingsRow>
      )}

      <SettingsRow label="Import Project" description="Load a .staves file into your library">
        <input
          ref={fileInputRef}
          type="file"
          accept=".staves"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md bg-zinc-800 px-3.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Choose File
        </button>
      </SettingsRow>

      {status && (
        <div className={`rounded-lg px-4 py-2.5 text-xs ${
          status.includes('failed') ? 'bg-red-950/40 text-red-300' : 'bg-zinc-800 text-zinc-400'
        }`}>
          {status}
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-zinc-800 pb-4">
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function DeviceSelect({
  devices, value, onChange, emptyLabel,
}: {
  devices: AudioDevice[];
  value: string;
  onChange: (id: string) => void;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = devices.find((d) => d.deviceId === value);
  const displayLabel = selected?.label ?? 'System Default';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    setOpen(false);
  }, [onChange]);

  if (devices.length === 0) {
    return <span className="text-xs text-zinc-600">{emptyLabel}</span>;
  }

  return (
    <div ref={ref} className="relative w-56">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-md bg-zinc-800 px-2.5 py-1.5 text-left text-xs ring-1 transition-colors ${
          open ? 'ring-zinc-500 text-zinc-100' : 'ring-zinc-700 text-zinc-300 hover:ring-zinc-600'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-850 bg-zinc-800 py-0.5 shadow-xl">
          <DropdownItem
            label="System Default"
            selected={value === ''}
            onClick={() => handleSelect('')}
          />
          {devices.map((d) => (
            <DropdownItem
              key={d.deviceId}
              label={d.label}
              selected={d.deviceId === value}
              onClick={() => handleSelect(d.deviceId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
        selected
          ? 'bg-zinc-700 text-zinc-100'
          : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200'
      }`}
    >
      <span className={`flex h-3 w-3 items-center justify-center flex-shrink-0 ${selected ? 'text-zinc-100' : 'text-transparent'}`}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4l2 2 4-4" />
        </svg>
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────

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
