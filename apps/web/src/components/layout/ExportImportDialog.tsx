import { useState, useRef } from 'react';
import { Dialog } from '@staves/ui';
import { exportProject, importProject } from '@staves/storage';

interface ExportImportDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onImported: (projectId: string) => void;
}

export function ExportImportDialog({ open, onClose, projectId, onImported }: ExportImportDialogProps) {
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
      a.download = `project-${projectId.slice(0, 8)}.staves`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Exported!');
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setStatus('Importing...');
      const id = await importProject(file);
      setStatus('Imported!');
      onImported(id);
      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1000);
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Export / Import">
      <div className="flex flex-col gap-4">
        {projectId && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Export project</span>
            <p className="text-xs text-zinc-400">Download as a .staves file (JSON + audio).</p>
            <button
              onClick={handleExport}
              className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
            >
              Export .staves
            </button>
          </div>
        )}

        <div className="border-t border-zinc-800" />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Import project</span>
          <p className="text-xs text-zinc-400">Load a .staves file into Staves.</p>
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
            className="rounded bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Choose .staves file
          </button>
        </div>

        {status && (
          <p className="text-xs text-zinc-400">{status}</p>
        )}
      </div>
    </Dialog>
  );
}
