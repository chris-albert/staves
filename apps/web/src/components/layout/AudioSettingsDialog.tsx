import { useEffect } from 'react';
import { Dialog } from '@staves/ui';
import { AudioEngine } from '@staves/audio-engine';
import type { AudioDevice } from '@/hooks/useAudioDevices';

interface AudioSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  selectedInputId: string;
  selectedOutputId: string;
  onSelectInput: (deviceId: string) => void;
  onSelectOutput: (deviceId: string) => void;
  permissionGranted: boolean;
  onRequestPermission: () => void;
}

export function AudioSettingsDialog({
  open,
  onClose,
  inputs,
  outputs,
  selectedInputId,
  selectedOutputId,
  onSelectInput,
  onSelectOutput,
  permissionGranted,
  onRequestPermission,
}: AudioSettingsDialogProps) {

  // Apply output device change to the audio engine
  useEffect(() => {
    if (!selectedOutputId) return;
    try {
      const engine = AudioEngine.getInstance();
      engine.setOutputDevice(selectedOutputId);
    } catch {
      // Engine not initialized yet
    }
  }, [selectedOutputId]);

  return (
    <Dialog open={open} onClose={onClose} title="Audio Settings">
      <div className="flex flex-col gap-6 min-w-[320px]">
        {!permissionGranted && (
          <div className="flex flex-col gap-2 rounded border border-zinc-700 bg-zinc-800/50 p-3">
            <p className="text-xs text-zinc-400">
              Microphone access is needed to see device names and to record.
            </p>
            <button
              onClick={onRequestPermission}
              className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
            >
              Allow Microphone Access
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Input Device</label>
          {inputs.length === 0 ? (
            <p className="text-xs text-zinc-500">No input devices found</p>
          ) : (
            <select
              value={selectedInputId}
              onChange={(e) => onSelectInput(e.target.value)}
              className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
            >
              <option value="">System Default</option>
              {inputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Output Device</label>
          {outputs.length === 0 ? (
            <p className="text-xs text-zinc-500">No output devices found (or browser doesn't support output selection)</p>
          ) : (
            <select
              value={selectedOutputId}
              onChange={(e) => onSelectOutput(e.target.value)}
              className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500"
            >
              <option value="">System Default</option>
              {outputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
}
