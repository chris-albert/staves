import { useCallback } from 'react';
import { AudioEngine, DRUM_KIT_BANKS, ALL_DRUM_SOUNDS, DEFAULT_SYNTH_PATCH } from '@staves/audio-engine';
import type { Track, DrumPattern, MidiPattern, Clip, SynthPatch, OscillatorWaveform, FilterType } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { Knob } from '@staves/ui';

const PANEL_HEIGHT = 200;

interface TrackDetailPanelProps {
  track: Track;
  trackClips: Clip[];
  drumPatterns: DrumPattern[];
  midiPatterns: MidiPattern[];
}

export function TrackDetailPanel({ track, trackClips, drumPatterns, midiPatterns }: TrackDetailPanelProps) {
  const setSelectedTrackId = useUiStore((s) => s.setSelectedTrackId);

  return (
    <div
      className="flex bg-zinc-900"
      style={{ height: PANEL_HEIGHT }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left panel — aligned with track list sidebar (w-60 = 240px) */}
      <div className="w-60 flex-shrink-0 flex flex-col border-r border-zinc-800/80">
        <div className="flex items-center gap-2 px-3 h-[26px] text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/50">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: track.color }}
          />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">
            {track.name}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setSelectedTrackId(null)}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        </div>
        <TrackControlsSummary track={track} />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden overflow-y-auto">
        {track.type === 'drum' ? (
          <DrumSoundEditor track={track} trackClips={trackClips} drumPatterns={drumPatterns} />
        ) : track.type === 'midi' ? (
          <SynthPatchEditor track={track} trackClips={trackClips} midiPatterns={midiPatterns} />
        ) : (
          <AudioTrackDetail track={track} />
        )}
      </div>
    </div>
  );
}

/* ---- Track controls summary ---- */

function TrackControlsSummary({ track }: { track: Track }) {
  const updateTrack = useProjectStore((s) => s.updateTrack);

  return (
    <div className="flex-1 flex flex-col gap-3 px-3 py-3">
      <div className="flex items-center gap-3">
        <Knob value={track.volume} min={0} max={1} onChange={(v) => updateTrack(track.id, { volume: v })} size={24} label="Vol" />
        <Knob value={track.pan} min={-1} max={1} onChange={(v) => updateTrack(track.id, { pan: v })} size={24} label="Pan" />
      </div>
      <div className="text-[10px] text-zinc-600 mt-auto">
        {track.type === 'drum' ? 'Drum Track' : track.type === 'midi' ? 'MIDI Synth Track' : 'Audio Track'}
      </div>
    </div>
  );
}

/* ---- Drum Sound Editor ---- */

function DrumSoundEditor({ trackClips, drumPatterns }: { track: Track; trackClips: Clip[]; drumPatterns: DrumPattern[] }) {
  const patterns = trackClips
    .filter((c) => c.drumPatternId)
    .map((c) => drumPatterns.find((p) => p.id === c.drumPatternId))
    .filter((p): p is DrumPattern => !!p);

  const uniquePatterns = Array.from(new Map(patterns.map((p) => [p.id, p])).values());

  if (uniquePatterns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        No drum patterns. Double-click the timeline to create one.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {uniquePatterns.map((pattern) => (
          <PatternSoundList key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </div>
  );
}

/* ---- Pattern sound list with kit bank selector ---- */

function PatternSoundList({ pattern }: { pattern: DrumPattern }) {
  const updateDrumPattern = useProjectStore((s) => s.updateDrumPattern);

  const previewPad = useCallback((sampleUrl: string) => {
    try {
      const engine = AudioEngine.getInstance();
      engine.drumSampler.loadSample(sampleUrl).then(() => {
        engine.drumSampler.scheduleHit(sampleUrl, engine.masterBus.input, engine.context.currentTime, 0.8);
      });
    } catch {
      // engine not ready
    }
  }, []);

  const setPadSample = useCallback(
    (padIndex: number, sampleUrl: string, name: string) => {
      const newPads = pattern.pads.map((p) =>
        p.index === padIndex ? { ...p, sampleUrl, name } : p,
      );
      updateDrumPattern(pattern.id, { pads: newPads });
    },
    [pattern.id, pattern.pads, updateDrumPattern],
  );

  /** Replace all 12 pads with a kit bank's sounds. */
  const loadKit = useCallback(
    (kitId: string) => {
      const bank = DRUM_KIT_BANKS.find((b) => b.id === kitId);
      if (!bank) return;
      const newPads = bank.sounds.map((sound, i) => ({
        index: i,
        name: sound.name,
        sampleUrl: sound.url,
      }));
      updateDrumPattern(pattern.id, { pads: newPads });

      // Pre-load all samples for the new kit
      try {
        const engine = AudioEngine.getInstance();
        for (const sound of bank.sounds) {
          engine.drumSampler.loadSample(sound.url);
        }
      } catch {
        // engine not ready
      }
    },
    [pattern.id, updateDrumPattern],
  );

  // Detect current kit (if all pads match a bank)
  const currentKitId = DRUM_KIT_BANKS.find((bank) =>
    bank.sounds.length === pattern.pads.length &&
    bank.sounds.every((s, i) => pattern.pads[i]?.sampleUrl === s.url),
  )?.id ?? '';

  return (
    <div className="flex flex-col h-full">
      {/* Header with kit bank selector */}
      <div className="flex items-center gap-3 px-3 h-[30px] flex-shrink-0 border-b border-zinc-800/50">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Kit</span>
        <div className="flex items-center gap-1">
          {DRUM_KIT_BANKS.map((bank) => (
            <button
              key={bank.id}
              onClick={() => loadKit(bank.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                currentKitId === bank.id
                  ? 'bg-blue-600/80 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
              }`}
            >
              {bank.name}
            </button>
          ))}
        </div>
      </div>

      {/* Pad sound grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-px bg-zinc-800/30 flex-1 overflow-y-auto">
        {pattern.pads.map((pad) => (
          <DrumPadSoundRow
            key={pad.index}
            pad={pad}
            onPreview={previewPad}
            onChangeSample={setPadSample}
          />
        ))}
      </div>
    </div>
  );
}

/* ---- Individual drum pad sound row ---- */

interface DrumPadSoundRowProps {
  pad: { index: number; name: string; sampleUrl: string };
  onPreview: (sampleUrl: string) => void;
  onChangeSample: (padIndex: number, sampleUrl: string, name: string) => void;
}

function DrumPadSoundRow({ pad, onPreview, onChangeSample }: DrumPadSoundRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/60 transition-colors">
      {/* Pad number */}
      <span className="text-[9px] text-zinc-600 w-3 text-right flex-shrink-0">
        {pad.index + 1}
      </span>

      {/* Preview button */}
      <button
        onClick={() => onPreview(pad.sampleUrl)}
        className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors flex-shrink-0"
        title="Preview"
      >
        <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor">
          <path d="M0 0v8l7-4z" />
        </svg>
      </button>

      {/* Sample selector — grouped by kit bank */}
      <select
        value={pad.sampleUrl}
        onChange={(e) => {
          const sound = ALL_DRUM_SOUNDS.find((s) => s.url === e.target.value);
          if (sound) {
            onChangeSample(pad.index, sound.url, sound.name);
          }
        }}
        className="flex-1 min-w-0 rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500 transition-colors truncate"
      >
        {DRUM_KIT_BANKS.map((bank) => (
          <optgroup key={bank.id} label={bank.name}>
            {bank.sounds.map((sound) => (
              <option key={sound.url} value={sound.url}>
                {sound.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

/* ---- Synth Patch Editor ---- */

const WAVEFORMS: OscillatorWaveform[] = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVEFORM_LABELS: Record<OscillatorWaveform, string> = {
  sine: 'Sin', sawtooth: 'Saw', square: 'Sqr', triangle: 'Tri',
};
const FILTER_TYPES: FilterType[] = ['lowpass', 'highpass', 'bandpass'];
const FILTER_LABELS: Record<FilterType, string> = {
  lowpass: 'LP', highpass: 'HP', bandpass: 'BP',
};

function SynthPatchEditor({ trackClips, midiPatterns }: { track: Track; trackClips: Clip[]; midiPatterns: MidiPattern[] }) {
  const updateMidiPattern = useProjectStore((s) => s.updateMidiPattern);

  const patterns = trackClips
    .filter((c) => c.midiPatternId)
    .map((c) => midiPatterns.find((p) => p.id === c.midiPatternId))
    .filter((p): p is MidiPattern => !!p);

  const uniquePatterns = Array.from(new Map(patterns.map((p) => [p.id, p])).values());

  // Edit the first pattern's patch (or show empty state)
  const pattern = uniquePatterns[0];
  const patch: SynthPatch = pattern?.synthPatch ?? DEFAULT_SYNTH_PATCH;

  const updatePatch = useCallback(
    (changes: Partial<SynthPatch>) => {
      if (!pattern) return;
      updateMidiPattern(pattern.id, { synthPatch: { ...patch, ...changes } });
    },
    [pattern, patch, updateMidiPattern],
  );

  if (!pattern) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        No MIDI patterns. Double-click the timeline to create one.
      </div>
    );
  }

  return (
    <div className="flex items-stretch h-full gap-px bg-zinc-800/30">
      {/* OSC Module */}
      <div className="flex flex-col bg-zinc-900 flex-1 min-w-[130px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Oscillator
        </div>
        <div className="flex flex-col gap-2 p-2 flex-1">
          <div className="flex gap-1">
            {WAVEFORMS.map((w) => (
              <button
                key={w}
                onClick={() => updatePatch({ oscillator: { ...patch.oscillator, waveform: w } })}
                className={`flex-1 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  patch.oscillator.waveform === w
                    ? 'bg-indigo-600/80 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {WAVEFORM_LABELS[w]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Knob
              value={patch.oscillator.detune}
              min={-100}
              max={100}
              onChange={(v) => updatePatch({ oscillator: { ...patch.oscillator, detune: Math.round(v) } })}
              size={22}
              label="Detune"
            />
            <Knob
              value={patch.oscillator.octaveOffset}
              min={-2}
              max={2}
              onChange={(v) => updatePatch({ oscillator: { ...patch.oscillator, octaveOffset: Math.round(v) } })}
              size={22}
              label="Oct"
            />
          </div>
        </div>
      </div>

      {/* Filter Module */}
      <div className="flex flex-col bg-zinc-900 flex-1 min-w-[130px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Filter
        </div>
        <div className="flex flex-col gap-2 p-2 flex-1">
          <div className="flex gap-1">
            {FILTER_TYPES.map((f) => (
              <button
                key={f}
                onClick={() => updatePatch({ filter: { ...patch.filter, type: f } })}
                className={`flex-1 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  patch.filter.type === f
                    ? 'bg-indigo-600/80 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Knob
              value={patch.filter.cutoff}
              min={20}
              max={20000}
              onChange={(v) => updatePatch({ filter: { ...patch.filter, cutoff: Math.round(v) } })}
              size={22}
              label="Cutoff"
            />
            <Knob
              value={patch.filter.resonance}
              min={0.1}
              max={30}
              onChange={(v) => updatePatch({ filter: { ...patch.filter, resonance: v } })}
              size={22}
              label="Res"
            />
          </div>
        </div>
      </div>

      {/* Amp Envelope Module */}
      <div className="flex flex-col bg-zinc-900 flex-1 min-w-[140px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Amp Env
        </div>
        <div className="flex items-center gap-1.5 p-2 flex-1">
          <Knob
            value={patch.ampEnvelope.attack}
            min={0.001}
            max={2}
            onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, attack: v } })}
            size={20}
            label="A"
          />
          <Knob
            value={patch.ampEnvelope.decay}
            min={0.001}
            max={2}
            onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, decay: v } })}
            size={20}
            label="D"
          />
          <Knob
            value={patch.ampEnvelope.sustain}
            min={0}
            max={1}
            onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, sustain: v } })}
            size={20}
            label="S"
          />
          <Knob
            value={patch.ampEnvelope.release}
            min={0.001}
            max={3}
            onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, release: v } })}
            size={20}
            label="R"
          />
        </div>
      </div>

      {/* Filter Envelope Module */}
      <div className="flex flex-col bg-zinc-900 flex-1 min-w-[160px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Filter Env
        </div>
        <div className="flex items-center gap-1.5 p-2 flex-1">
          <Knob
            value={patch.filterEnvelope.attack}
            min={0.001}
            max={2}
            onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, attack: v } })}
            size={20}
            label="A"
          />
          <Knob
            value={patch.filterEnvelope.decay}
            min={0.001}
            max={2}
            onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, decay: v } })}
            size={20}
            label="D"
          />
          <Knob
            value={patch.filterEnvelope.sustain}
            min={0}
            max={1}
            onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, sustain: v } })}
            size={20}
            label="S"
          />
          <Knob
            value={patch.filterEnvelope.release}
            min={0.001}
            max={3}
            onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, release: v } })}
            size={20}
            label="R"
          />
          <Knob
            value={patch.filterEnvelope.amount}
            min={0}
            max={10000}
            onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, amount: Math.round(v) } })}
            size={20}
            label="Amt"
          />
        </div>
      </div>
    </div>
  );
}

/* ---- Audio track detail ---- */

function AudioTrackDetail({ track }: { track: Track }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-[26px] text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/50">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Track Settings</span>
      </div>
      <div className="flex items-center justify-center flex-1 text-xs text-zinc-600">
        <div className="text-center">
          <div className="text-zinc-500 mb-1">{track.name}</div>
          <div className="text-[10px]">Select a track to view its settings. Effects coming soon.</div>
        </div>
      </div>
    </div>
  );
}
