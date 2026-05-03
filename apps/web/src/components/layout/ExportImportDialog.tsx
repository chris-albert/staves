import { useState, useRef } from 'react';
import { Dialog } from '@staves/ui';
import { exportProject, importProject, audioBlobStore } from '@staves/storage';
import { AudioEngine, TempoMap, exportToWav } from '@staves/audio-engine';
import type { ScheduledClip, ScheduledDrumClip, ScheduledDrumHit } from '@staves/audio-engine';
import { useProjectStore } from '@/stores/projectStore';

interface ExportImportDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onImported: (projectId: string) => void;
}

export function ExportImportDialog({ open, onClose, projectId, onImported }: ExportImportDialogProps) {
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tracks = useProjectStore((s) => s.tracks);
  const clips = useProjectStore((s) => s.clips);
  const drumPatterns = useProjectStore((s) => s.drumPatterns);
  const tempoEvents = useProjectStore((s) => s.tempoEvents);
  const timeSignatureEvents = useProjectStore((s) => s.timeSignatureEvents);

  const handleExportWav = async () => {
    if (!projectId) return;
    try {
      setStatus('Rendering WAV...');
      const engine = AudioEngine.getInstance();
      await engine.init();

      const tempoMap = new TempoMap(tempoEvents, timeSignatureEvents);

      // Determine if any track is soloed
      const anySoloed = tracks.some((t) => t.isSolo);

      // Build track property maps
      const trackVolumes = new Map<string, number>();
      const trackPans = new Map<string, number>();
      const trackMuted = new Map<string, boolean>();
      for (const track of tracks) {
        trackVolumes.set(track.id, track.volume);
        trackPans.set(track.id, track.pan);
        trackMuted.set(track.id, anySoloed ? !track.isSolo : track.isMuted);
      }

      // Build scheduled audio clips
      const scheduledClips: ScheduledClip[] = [];
      for (const clip of clips) {
        if (clip.drumPatternId) continue;
        if (!clip.audioBlobId) continue;
        let buffer = engine.clipPlayer.getBuffer(clip.audioBlobId);
        if (!buffer) {
          const audioBlob = await audioBlobStore.get(clip.audioBlobId);
          if (audioBlob) {
            buffer = await engine.clipPlayer.decodeBlob(clip.audioBlobId, audioBlob.data);
          }
        }
        if (!buffer) continue;
        scheduledClips.push({
          clipId: clip.id,
          trackId: clip.trackId,
          buffer,
          startBeat: clip.startBeat,
          durationBeats: clip.durationBeats,
          offsetBeats: clip.offsetBeats,
          gainDb: clip.gainDb,
          fadeInBeats: clip.fadeInBeats ?? 0,
          fadeOutBeats: clip.fadeOutBeats ?? 0,
        });
      }

      // Build scheduled drum clips
      const patternMap = new Map(drumPatterns.map((p) => [p.id, p]));
      const scheduledDrumClips: ScheduledDrumClip[] = [];
      const drumSampleBuffers = new Map<string, AudioBuffer>();

      for (const clip of clips) {
        if (!clip.drumPatternId) continue;
        const pattern = patternMap.get(clip.drumPatternId);
        if (!pattern) continue;

        // Load drum samples
        for (const pad of pattern.pads) {
          if (pad.sampleUrl && !drumSampleBuffers.has(pad.sampleUrl)) {
            const buf = engine.drumSampler.getBuffer(pad.sampleUrl);
            if (buf) drumSampleBuffers.set(pad.sampleUrl, buf);
          }
        }

        const hits: ScheduledDrumHit[] = [];
        const beatPerStep = 1 / pattern.stepsPerBeat;
        for (const step of pattern.activeSteps) {
          const pad = pattern.pads[step.padIndex];
          if (!pad) continue;
          hits.push({
            beat: clip.startBeat + step.step * beatPerStep,
            sampleKey: pad.sampleUrl,
            velocity: step.velocity,
          });
        }

        scheduledDrumClips.push({
          clipId: clip.id,
          trackId: clip.trackId,
          startBeat: clip.startBeat,
          durationBeats: clip.durationBeats,
          hits,
        });
      }

      // Calculate total duration
      let maxEndBeat = 0;
      for (const clip of clips) {
        maxEndBeat = Math.max(maxEndBeat, clip.startBeat + clip.durationBeats);
      }
      if (maxEndBeat <= 0) {
        setStatus('No clips to export');
        return;
      }
      // Add a tiny tail for reverb/release
      maxEndBeat += 1;

      const wavBlob = await exportToWav({
        sampleRate: 48000,
        durationBeats: maxEndBeat,
        tempoMap,
        clips: scheduledClips,
        drumClips: scheduledDrumClips,
        drumSampleBuffers,
        trackVolumes,
        trackPans,
        trackMuted,
        masterVolume: engine.masterBus.volume,
      });

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      const projName = useProjectStore.getState().project?.name ?? 'project';
      a.download = `${projName}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('WAV exported!');
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      setStatus(`WAV export failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

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
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
              >
                Export .staves
              </button>
              <button
                onClick={handleExportWav}
                className="rounded bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Export WAV
              </button>
            </div>
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
