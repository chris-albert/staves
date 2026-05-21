import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioEngine, DRUM_KIT_BANKS, ALL_DRUM_SOUNDS, DEFAULT_SYNTH_PATCH, DEFAULT_ARPEGGIATOR,
  DEFAULT_CHORD, DEFAULT_HUMANIZE, DEFAULT_TRANSPOSE, DEFAULT_SCALE_QUANTIZE,
  DEFAULT_STRUM, DEFAULT_PROBABILITY_GATE, DEFAULT_VELOCITY_MAP,
  DEFAULT_NOTE_FILTER, DEFAULT_NOTE_REPEAT, DEFAULT_EUCLIDEAN_RHYTHM,
} from '@staves/audio-engine';
import type {
  Track, DrumPattern, MidiPattern, Clip, SynthPatch, OscillatorConfig, OscillatorWaveform,
  FilterType, NoiseType, NoiseConfig, SynthMixer,
  TrackModule, ArpeggiatorModule, ArpMode, ArpRate,
  ChordModule, ChordQuality, HumanizeModule, TransposeModule,
  ScaleQuantizeModule, ScaleName, NoteName, StrumModule, StrumDirection,
  ProbabilityGateModule, VelocityMapModule, VelocityCurveType,
  NoteFilterModule, NoteRepeatModule, EuclideanRhythmModule,
} from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { Knob } from '@staves/ui';
import { InputSelect } from './InputSelect';
import type { AudioDevice } from '@/hooks/useAudioDevices';

const PANEL_HEIGHT = 200;

interface TrackDetailPanelProps {
  track: Track;
  trackClips: Clip[];
  drumPatterns: DrumPattern[];
  midiPatterns: MidiPattern[];
}

export function TrackDetailPanel({ track, trackClips, drumPatterns, midiPatterns }: TrackDetailPanelProps) {
  return (
    <div
      className="flex bg-zinc-900 h-full"
      onClick={(e) => e.stopPropagation()}
    >
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

/** Sidebar controls for the track detail panel, rendered in the track list sidebar */
export function TrackDetailSidebar({ track, audioInputs }: { track: Track; audioInputs?: AudioDevice[] }) {
  const setSelectedTrackId = useUiStore((s) => s.setSelectedTrackId);
  const updateTrack = useProjectStore((s) => s.updateTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(track.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== track.name) {
      updateTrack(track.id, { name: trimmed });
    } else {
      setNameValue(track.name);
    }
    setEditingName(false);
  }, [nameValue, track.id, track.name, updateTrack]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="flex items-center gap-2 px-3 h-[26px] text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/50">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: track.color }}
        />
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') { setNameValue(track.name); setEditingName(false); }
            }}
            className="text-[10px] font-semibold text-zinc-200 bg-zinc-800 rounded px-1 py-0 outline-none ring-1 ring-zinc-600 focus:ring-zinc-400 min-w-0 flex-1"
          />
        ) : (
          <span
            className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate cursor-text hover:text-zinc-200 transition-colors"
            onClick={() => { setNameValue(track.name); setEditingName(true); }}
            title="Click to rename"
          >
            {track.name}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setSelectedTrackId(null)}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors flex-shrink-0"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      </div>
      <TrackControlsSummary track={track} audioInputs={audioInputs} />
      <div className="px-3 pb-3">
        <button
          onClick={() => removeTrack(track.id)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          title="Delete track"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
          Delete Track
        </button>
      </div>
    </div>
  );
}

/* ---- Track controls summary ---- */

function TrackControlsSummary({ track, audioInputs }: { track: Track; audioInputs?: AudioDevice[] }) {
  const updateTrack = useProjectStore((s) => s.updateTrack);

  return (
    <div className="flex-1 flex flex-col gap-3 px-3 py-3">
      {track.type === 'audio' && audioInputs && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">In</span>
          <InputSelect
            devices={audioInputs}
            value={track.inputDeviceId}
            onChange={(id) => updateTrack(track.id, { inputDeviceId: id })}
          />
        </div>
      )}
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
const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown'];
const NOISE_LABELS: Record<NoiseType, string> = { white: 'Wht', pink: 'Pnk', brown: 'Brn' };
const DEFAULT_OSC: OscillatorConfig = { waveform: 'sawtooth', detune: 0, octaveOffset: 0 };
const DEFAULT_NOISE_CFG: NoiseConfig = { type: 'white' };
const DEFAULT_MIXER: SynthMixer = { osc1: 1, osc2: 0, osc3: 0, noise: 0 };

function OscModule({ label, config, onChange }: {
  label: string; config: OscillatorConfig; onChange: (c: OscillatorConfig) => void;
}) {
  return (
    <div className="flex flex-col bg-zinc-900 min-w-[120px]">
      <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
        {label}
      </div>
      <div className="flex flex-col gap-2 p-2 flex-1">
        <div className="flex gap-0.5">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => onChange({ ...config, waveform: w })}
              className={`flex-1 px-0.5 py-0.5 rounded text-[8px] font-medium transition-colors ${
                config.waveform === w
                  ? 'bg-indigo-600/80 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {WAVEFORM_LABELS[w]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Knob value={config.detune} min={-100} max={100} onChange={(v) => onChange({ ...config, detune: Math.round(v) })} size={20} label="Det" />
          <Knob value={config.octaveOffset} min={-2} max={2} onChange={(v) => onChange({ ...config, octaveOffset: Math.round(v) })} size={20} label="Oct" />
        </div>
      </div>
    </div>
  );
}

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
  const mixer: SynthMixer = patch.mixer ?? DEFAULT_MIXER;
  const modules: TrackModule[] = pattern?.modules ?? [];

  const updatePatch = useCallback(
    (changes: Partial<SynthPatch>) => {
      if (!pattern) return;
      updateMidiPattern(pattern.id, { synthPatch: { ...patch, ...changes } });
    },
    [pattern, patch, updateMidiPattern],
  );

  const updateModules = useCallback(
    (newModules: TrackModule[]) => {
      if (!pattern) return;
      updateMidiPattern(pattern.id, { modules: newModules });
    },
    [pattern, updateMidiPattern],
  );

  const addModule = useCallback(
    (type: TrackModule['type']) => {
      const DEFAULTS: Record<TrackModule['type'], TrackModule> = {
        'arpeggiator': DEFAULT_ARPEGGIATOR,
        'chord': DEFAULT_CHORD,
        'humanize': DEFAULT_HUMANIZE,
        'transpose': DEFAULT_TRANSPOSE,
        'scale-quantize': DEFAULT_SCALE_QUANTIZE,
        'strum': DEFAULT_STRUM,
        'probability-gate': DEFAULT_PROBABILITY_GATE,
        'velocity-map': DEFAULT_VELOCITY_MAP,
        'note-filter': DEFAULT_NOTE_FILTER,
        'note-repeat': DEFAULT_NOTE_REPEAT,
        'euclidean-rhythm': DEFAULT_EUCLIDEAN_RHYTHM,
      };
      updateModules([...modules, { ...DEFAULTS[type], id: crypto.randomUUID() }]);
    },
    [modules, updateModules],
  );

  const updateModule = useCallback(
    (moduleId: string, changes: Partial<TrackModule>) => {
      updateModules(modules.map((m) => m.id === moduleId ? { ...m, ...changes } as TrackModule : m));
    },
    [modules, updateModules],
  );

  const removeModule = useCallback(
    (moduleId: string) => {
      updateModules(modules.filter((m) => m.id !== moduleId));
    },
    [modules, updateModules],
  );

  const moveModule = useCallback(
    (moduleId: string, dir: -1 | 1) => {
      const idx = modules.findIndex((m) => m.id === moduleId);
      if (idx < 0) return;
      const target = idx + dir;
      if (target < 0 || target >= modules.length) return;
      const next = [...modules];
      const tmp = next[idx]!;
      next[idx] = next[target]!;
      next[target] = tmp;
      updateModules(next);
    },
    [modules, updateModules],
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
      {/* ---- MIDI Modules (left) ---- */}
      <div className="flex items-stretch gap-px flex-shrink-0 overflow-x-auto">
        {modules.map((mod, i) => (
          <MidiModuleEditor
            key={mod.id}
            module={mod}
            onUpdate={(changes) => updateModule(mod.id, changes)}
            onRemove={() => removeModule(mod.id)}
            onMoveLeft={i > 0 ? () => moveModule(mod.id, -1) : undefined}
            onMoveRight={i < modules.length - 1 ? () => moveModule(mod.id, 1) : undefined}
          />
        ))}
        <AddModuleButton onAdd={addModule} />
      </div>

      {/* ---- Signal flow arrow ---- */}
      <div className="flex items-center px-1 text-zinc-600 flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10M10 5l3 3-3 3" />
        </svg>
      </div>

      {/* ---- Audio Modules (right) ---- */}
      <OscModule label="OSC 1" config={patch.oscillator} onChange={(c) => updatePatch({ oscillator: c })} />
      <OscModule label="OSC 2" config={patch.osc2 ?? DEFAULT_OSC} onChange={(c) => updatePatch({ osc2: c })} />
      <OscModule label="OSC 3" config={patch.osc3 ?? DEFAULT_OSC} onChange={(c) => updatePatch({ osc3: c })} />

      {/* Noise Module */}
      <div className="flex flex-col bg-zinc-900 min-w-[90px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Noise
        </div>
        <div className="flex flex-col gap-2 p-2 flex-1">
          <div className="flex gap-0.5">
            {NOISE_TYPES.map((n) => (
              <button
                key={n}
                onClick={() => updatePatch({ noise: { ...(patch.noise ?? DEFAULT_NOISE_CFG), type: n } })}
                className={`flex-1 px-1 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  (patch.noise ?? DEFAULT_NOISE_CFG).type === n
                    ? 'bg-indigo-600/80 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {NOISE_LABELS[n]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mixer Module */}
      <div className="flex flex-col bg-zinc-900 min-w-[110px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Mixer
        </div>
        <div className="flex items-center gap-1.5 p-2 flex-1">
          <Knob value={mixer.osc1} min={0} max={1} onChange={(v) => updatePatch({ mixer: { ...mixer, osc1: Math.round(v * 100) / 100 } })} size={18} label="O1" />
          <Knob value={mixer.osc2} min={0} max={1} onChange={(v) => updatePatch({ mixer: { ...mixer, osc2: Math.round(v * 100) / 100 } })} size={18} label="O2" />
          <Knob value={mixer.osc3} min={0} max={1} onChange={(v) => updatePatch({ mixer: { ...mixer, osc3: Math.round(v * 100) / 100 } })} size={18} label="O3" />
          <Knob value={mixer.noise} min={0} max={1} onChange={(v) => updatePatch({ mixer: { ...mixer, noise: Math.round(v * 100) / 100 } })} size={18} label="Nse" />
        </div>
      </div>

      {/* Filter Module */}
      <div className="flex flex-col bg-zinc-900 min-w-[130px]">
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
            <Knob value={patch.filter.cutoff} min={20} max={20000} onChange={(v) => updatePatch({ filter: { ...patch.filter, cutoff: Math.round(v) } })} size={22} label="Cutoff" />
            <Knob value={patch.filter.resonance} min={0.1} max={30} onChange={(v) => updatePatch({ filter: { ...patch.filter, resonance: v } })} size={22} label="Res" />
          </div>
        </div>
      </div>

      {/* Amp Envelope Module */}
      <div className="flex flex-col bg-zinc-900 min-w-[140px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Amp Env
        </div>
        <div className="flex items-center gap-1.5 p-2 flex-1">
          <Knob value={patch.ampEnvelope.attack} min={0.001} max={2} onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, attack: v } })} size={20} label="A" />
          <Knob value={patch.ampEnvelope.decay} min={0.001} max={2} onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, decay: v } })} size={20} label="D" />
          <Knob value={patch.ampEnvelope.sustain} min={0} max={1} onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, sustain: v } })} size={20} label="S" />
          <Knob value={patch.ampEnvelope.release} min={0.001} max={3} onChange={(v) => updatePatch({ ampEnvelope: { ...patch.ampEnvelope, release: v } })} size={20} label="R" />
        </div>
      </div>

      {/* Filter Envelope Module */}
      <div className="flex flex-col bg-zinc-900 min-w-[160px]">
        <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50">
          Filter Env
        </div>
        <div className="flex items-center gap-1.5 p-2 flex-1">
          <Knob value={patch.filterEnvelope.attack} min={0.001} max={2} onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, attack: v } })} size={20} label="A" />
          <Knob value={patch.filterEnvelope.decay} min={0.001} max={2} onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, decay: v } })} size={20} label="D" />
          <Knob value={patch.filterEnvelope.sustain} min={0} max={1} onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, sustain: v } })} size={20} label="S" />
          <Knob value={patch.filterEnvelope.release} min={0.001} max={3} onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, release: v } })} size={20} label="R" />
          <Knob value={patch.filterEnvelope.amount} min={0} max={10000} onChange={(v) => updatePatch({ filterEnvelope: { ...patch.filterEnvelope, amount: Math.round(v) } })} size={20} label="Amt" />
        </div>
      </div>
    </div>
  );
}

/* ---- Arpeggiator Module Editor ---- */

const ARP_MODES: { value: ArpMode; label: string }[] = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Dn' },
  { value: 'up-down', label: 'U/D' },
  { value: 'random', label: 'Rnd' },
];

const ARP_RATES: { value: ArpRate; label: string }[] = [
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/8T', label: '1/8T' },
  { value: '1/16', label: '1/16' },
  { value: '1/16T', label: '1/16T' },
  { value: '1/32', label: '1/32' },
];

const VELOCITY_CURVES: { value: ArpeggiatorModule['velocityCurve']; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'accent-first', label: 'Acc' },
  { value: 'crescendo', label: 'Cre' },
  { value: 'decrescendo', label: 'Dec' },
];

function ArpeggiatorModuleEditor({
  module: mod,
  onUpdate,
  onRemove,
  onMoveLeft,
  onMoveRight,
}: {
  module: ArpeggiatorModule;
  onUpdate: (changes: Partial<ArpeggiatorModule>) => void;
  onRemove: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}) {
  return (
    <div className={`flex flex-col bg-zinc-900 min-w-[150px] max-w-[180px] ${!mod.enabled ? 'opacity-50' : ''}`}>
      <ModuleHeader label="Arpeggiator" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />

      <div className="flex flex-col gap-1.5 p-2 flex-1 overflow-y-auto">
        {/* Mode */}
        <div className="flex gap-0.5">
          {ARP_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => onUpdate({ mode: m.value })}
              className={`flex-1 px-0.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                mod.mode === m.value
                  ? 'bg-emerald-600/80 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Rate */}
        <div>
          <span className="text-[8px] text-zinc-600 uppercase">Rate</span>
          <div className="flex gap-0.5 mt-0.5">
            {ARP_RATES.map((r) => (
              <button
                key={r.value}
                onClick={() => onUpdate({ rate: r.value })}
                className={`flex-1 px-0 py-0.5 rounded text-[8px] font-medium transition-colors ${
                  mod.rate === r.value
                    ? 'bg-emerald-600/80 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Knobs row 1: Octaves, Gate */}
        <div className="flex items-center gap-2 justify-center">
          <Knob
            value={mod.octaves}
            min={1}
            max={4}
            onChange={(v) => onUpdate({ octaves: Math.round(v) })}
            size={20}
            label="Oct"
          />
          <Knob
            value={mod.gateLength}
            min={0.01}
            max={1}
            onChange={(v) => onUpdate({ gateLength: Math.round(v * 100) / 100 })}
            size={20}
            label="Gate"
          />
        </div>

        {/* Knobs row 2: Swing, Length */}
        <div className="flex items-center gap-2 justify-center">
          <Knob
            value={mod.swing}
            min={0}
            max={1}
            onChange={(v) => onUpdate({ swing: Math.round(v * 100) / 100 })}
            size={20}
            label="Swing"
          />
          <Knob
            value={mod.patternLength}
            min={0}
            max={32}
            onChange={(v) => onUpdate({ patternLength: Math.round(v) })}
            size={20}
            label="Len"
          />
        </div>

        {/* Velocity curve */}
        <div>
          <span className="text-[8px] text-zinc-600 uppercase">Velocity</span>
          <div className="flex gap-0.5 mt-0.5">
            {VELOCITY_CURVES.map((vc) => (
              <button
                key={vc.value}
                onClick={() => onUpdate({ velocityCurve: vc.value })}
                className={`flex-1 px-0 py-0.5 rounded text-[8px] font-medium transition-colors ${
                  mod.velocityCurve === vc.value
                    ? 'bg-emerald-600/80 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {vc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Shared module header ---- */

function ModuleHeader({ label, enabled, onToggle, onRemove, onMoveLeft, onMoveRight }: {
  label: string; enabled: boolean; onToggle: () => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-zinc-800/50">
      <button
        onClick={onToggle}
        className={`w-3 h-3 rounded-sm border flex-shrink-0 transition-colors ${
          enabled ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'
        }`}
        title={enabled ? 'Disable' : 'Enable'}
      />
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex-1 truncate">{label}</span>
      <button
        onClick={onMoveLeft}
        disabled={!onMoveLeft}
        className="flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0 disabled:opacity-25 disabled:pointer-events-none"
        title="Move left"
      >
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 1L1.5 3.5L4.5 6" />
        </svg>
      </button>
      <button
        onClick={onMoveRight}
        disabled={!onMoveRight}
        className="flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0 disabled:opacity-25 disabled:pointer-events-none"
        title="Move right"
      >
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 1L5.5 3.5L2.5 6" />
        </svg>
      </button>
      <button
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors flex-shrink-0"
        title="Remove module"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l6 6M7 1l-6 6" />
        </svg>
      </button>
    </div>
  );
}

function ModuleShell({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col bg-zinc-900 min-w-[130px] max-w-[170px] ${!enabled ? 'opacity-50' : ''}`}>
      {children}
    </div>
  );
}

function ButtonRow<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 px-0.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
            value === o.value ? 'bg-emerald-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Module dispatcher ---- */

function MidiModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: TrackModule;
  onUpdate: (changes: Partial<TrackModule>) => void;
  onRemove: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}) {
  const move = { onMoveLeft, onMoveRight };
  switch (mod.type) {
    case 'arpeggiator':
      return <ArpeggiatorModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'chord':
      return <ChordModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'humanize':
      return <HumanizeModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'transpose':
      return <TransposeModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'scale-quantize':
      return <ScaleQuantizeModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'strum':
      return <StrumModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'probability-gate':
      return <ProbabilityGateModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'velocity-map':
      return <VelocityMapModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'note-filter':
      return <NoteFilterModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'note-repeat':
      return <NoteRepeatModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
    case 'euclidean-rhythm':
      return <EuclideanRhythmModuleEditor module={mod} onUpdate={onUpdate} onRemove={onRemove} {...move} />;
  }
}

/* ---- Add Module Button with dropdown picker ---- */

const MODULE_TYPES: { type: TrackModule['type']; label: string; group: string }[] = [
  { type: 'arpeggiator', label: 'Arpeggiator', group: 'Generative' },
  { type: 'chord', label: 'Chord', group: 'Generative' },
  { type: 'euclidean-rhythm', label: 'Euclidean', group: 'Generative' },
  { type: 'strum', label: 'Strum', group: 'Generative' },
  { type: 'note-repeat', label: 'Note Repeat', group: 'Generative' },
  { type: 'transpose', label: 'Transpose', group: 'Transform' },
  { type: 'scale-quantize', label: 'Scale Quantize', group: 'Transform' },
  { type: 'humanize', label: 'Humanize', group: 'Transform' },
  { type: 'velocity-map', label: 'Velocity Map', group: 'Transform' },
  { type: 'probability-gate', label: 'Prob. Gate', group: 'Filter' },
  { type: 'note-filter', label: 'Note Filter', group: 'Filter' },
];

function AddModuleButton({ onAdd }: { onAdd: (type: TrackModule['type']) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    }
    setOpen(!open);
  };

  return (
    <>
      <div className="flex flex-col bg-zinc-900 justify-center items-center px-2 min-w-[40px]">
        <button
          ref={btnRef}
          onClick={handleClick}
          className="flex flex-col items-center gap-1 px-1.5 py-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Add MIDI module"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          <span className="text-[8px] leading-none">Module</span>
        </button>
      </div>
      {open && (
        <div
          ref={menuRef}
          className="fixed w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[100] py-1 max-h-[280px] overflow-y-auto"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {['Generative', 'Transform', 'Filter'].map((group) => (
            <div key={group}>
              <div className="px-2 pt-1.5 pb-0.5 text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">{group}</div>
              {MODULE_TYPES.filter((m) => m.group === group).map((m) => (
                <button
                  key={m.type}
                  onClick={() => { onAdd(m.type); setOpen(false); }}
                  className="w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {m.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- Chord Module Editor ---- */

const CHORD_QUALITIES: { value: ChordQuality; label: string }[] = [
  { value: 'major', label: 'Maj' }, { value: 'minor', label: 'Min' },
  { value: 'dim', label: 'Dim' }, { value: 'aug', label: 'Aug' },
  { value: 'sus2', label: 'S2' }, { value: 'sus4', label: 'S4' },
  { value: 'maj7', label: 'M7' }, { value: 'min7', label: 'm7' },
  { value: 'dom7', label: '7' },
];

function ChordModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: ChordModule; onUpdate: (c: Partial<ChordModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Chord" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-1.5 p-2 flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-0.5">
          {CHORD_QUALITIES.map((q) => (
            <button
              key={q.value}
              onClick={() => onUpdate({ quality: q.value })}
              className={`px-1 py-0.5 rounded text-[8px] font-medium transition-colors ${
                mod.quality === q.value ? 'bg-emerald-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.velocityScale} min={0} max={1} onChange={(v) => onUpdate({ velocityScale: Math.round(v * 100) / 100 })} size={20} label="Vel" />
        </div>
      </div>
    </ModuleShell>
  );
}

/* ---- Humanize Module Editor ---- */

function HumanizeModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: HumanizeModule; onUpdate: (c: Partial<HumanizeModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Humanize" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1">
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.timingAmount} min={0} max={0.1} onChange={(v) => onUpdate({ timingAmount: Math.round(v * 1000) / 1000 })} size={20} label="Time" />
          <Knob value={mod.velocityAmount} min={0} max={0.5} onChange={(v) => onUpdate({ velocityAmount: Math.round(v * 100) / 100 })} size={20} label="Vel" />
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.durationAmount} min={0} max={0.5} onChange={(v) => onUpdate({ durationAmount: Math.round(v * 100) / 100 })} size={20} label="Dur" />
        </div>
      </div>
    </ModuleShell>
  );
}

/* ---- Transpose Module Editor ---- */

function TransposeModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: TransposeModule; onUpdate: (c: Partial<TransposeModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Transpose" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1 items-center justify-center">
        <Knob value={mod.semitones} min={-48} max={48} onChange={(v) => onUpdate({ semitones: Math.round(v) })} size={28} label="Semi" />
        <span className="text-[10px] text-zinc-400 font-mono">{mod.semitones > 0 ? '+' : ''}{mod.semitones}</span>
      </div>
    </ModuleShell>
  );
}

/* ---- Scale Quantize Module Editor ---- */

const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALE_NAMES: { value: ScaleName; label: string }[] = [
  { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' }, { value: 'mixolydian', label: 'Mixo' },
  { value: 'pentatonic-major', label: 'Pent Maj' }, { value: 'pentatonic-minor', label: 'Pent Min' },
  { value: 'blues', label: 'Blues' }, { value: 'harmonic-minor', label: 'Harm Min' },
  { value: 'melodic-minor', label: 'Mel Min' }, { value: 'chromatic', label: 'Chrom' },
];

function ScaleQuantizeModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: ScaleQuantizeModule; onUpdate: (c: Partial<ScaleQuantizeModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Scale Qnt" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-1.5 p-2 flex-1 overflow-y-auto">
        <div>
          <span className="text-[8px] text-zinc-600 uppercase">Root</span>
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {NOTE_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => onUpdate({ root: n })}
                className={`px-1 py-0.5 rounded text-[8px] font-medium transition-colors ${
                  mod.root === n ? 'bg-emerald-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[8px] text-zinc-600 uppercase">Scale</span>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {SCALE_NAMES.map((s) => (
              <button
                key={s.value}
                onClick={() => onUpdate({ scale: s.value })}
                className={`w-full text-left px-1 py-0.5 rounded text-[8px] font-medium transition-colors ${
                  mod.scale === s.value ? 'bg-emerald-600/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

/* ---- Strum Module Editor ---- */

const STRUM_DIRS: { value: StrumDirection; label: string }[] = [
  { value: 'down', label: 'Down' }, { value: 'up', label: 'Up' }, { value: 'alternate', label: 'Alt' },
];

function StrumModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: StrumModule; onUpdate: (c: Partial<StrumModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Strum" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1">
        <ButtonRow options={STRUM_DIRS} value={mod.direction} onChange={(v) => onUpdate({ direction: v })} />
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.delayPerNote} min={0.005} max={0.15} onChange={(v) => onUpdate({ delayPerNote: Math.round(v * 1000) / 1000 })} size={20} label="Delay" />
        </div>
      </div>
    </ModuleShell>
  );
}

/* ---- Probability Gate Module Editor ---- */

function ProbabilityGateModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: ProbabilityGateModule; onUpdate: (c: Partial<ProbabilityGateModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Prob Gate" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1 items-center justify-center">
        <Knob value={mod.probability} min={0} max={1} onChange={(v) => onUpdate({ probability: Math.round(v * 100) / 100 })} size={28} label="Prob" />
        <span className="text-[10px] text-zinc-400 font-mono">{Math.round(mod.probability * 100)}%</span>
      </div>
    </ModuleShell>
  );
}

/* ---- Velocity Map Module Editor ---- */

const VELOCITY_MAP_CURVES: { value: VelocityCurveType; label: string }[] = [
  { value: 'compress', label: 'Cmp' }, { value: 'expand', label: 'Exp' },
  { value: 'fixed', label: 'Fix' }, { value: 'random-range', label: 'Rnd' },
];

function VelocityMapModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: VelocityMapModule; onUpdate: (c: Partial<VelocityMapModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Vel Map" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-1.5 p-2 flex-1">
        <ButtonRow options={VELOCITY_MAP_CURVES} value={mod.curve} onChange={(v) => onUpdate({ curve: v })} />
        {mod.curve === 'fixed' && (
          <div className="flex items-center gap-2 justify-center">
            <Knob value={mod.fixedValue} min={0} max={1} onChange={(v) => onUpdate({ fixedValue: Math.round(v * 100) / 100 })} size={20} label="Value" />
          </div>
        )}
        {mod.curve === 'random-range' && (
          <div className="flex items-center gap-2 justify-center">
            <Knob value={mod.min} min={0} max={1} onChange={(v) => onUpdate({ min: Math.round(v * 100) / 100 })} size={20} label="Min" />
            <Knob value={mod.max} min={0} max={1} onChange={(v) => onUpdate({ max: Math.round(v * 100) / 100 })} size={20} label="Max" />
          </div>
        )}
      </div>
    </ModuleShell>
  );
}

/* ---- Note Filter Module Editor ---- */

function NoteFilterModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: NoteFilterModule; onUpdate: (c: Partial<NoteFilterModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Note Filter" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1">
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.minPitch} min={0} max={127} onChange={(v) => onUpdate({ minPitch: Math.round(v) })} size={20} label="Lo" />
          <Knob value={mod.maxPitch} min={0} max={127} onChange={(v) => onUpdate({ maxPitch: Math.round(v) })} size={20} label="Hi" />
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.minVelocity} min={0} max={1} onChange={(v) => onUpdate({ minVelocity: Math.round(v * 100) / 100 })} size={20} label="V Lo" />
          <Knob value={mod.maxVelocity} min={0} max={1} onChange={(v) => onUpdate({ maxVelocity: Math.round(v * 100) / 100 })} size={20} label="V Hi" />
        </div>
      </div>
    </ModuleShell>
  );
}

/* ---- Note Repeat Module Editor ---- */

function NoteRepeatModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: NoteRepeatModule; onUpdate: (c: Partial<NoteRepeatModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Note Repeat" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1">
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.repeats} min={1} max={8} onChange={(v) => onUpdate({ repeats: Math.round(v) })} size={20} label="Rep" />
          <Knob value={mod.interval} min={0.0625} max={1} onChange={(v) => onUpdate({ interval: Math.round(v * 1000) / 1000 })} size={20} label="Int" />
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.decay} min={0.1} max={1} onChange={(v) => onUpdate({ decay: Math.round(v * 100) / 100 })} size={20} label="Decay" />
        </div>
      </div>
    </ModuleShell>
  );
}

/* ---- Euclidean Rhythm Module Editor ---- */

function EuclideanRhythmModuleEditor({ module: mod, onUpdate, onRemove, onMoveLeft, onMoveRight }: {
  module: EuclideanRhythmModule; onUpdate: (c: Partial<EuclideanRhythmModule>) => void; onRemove: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
}) {
  return (
    <ModuleShell enabled={mod.enabled}>
      <ModuleHeader label="Euclidean" enabled={mod.enabled} onToggle={() => onUpdate({ enabled: !mod.enabled })} onRemove={onRemove} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} />
      <div className="flex flex-col gap-2 p-2 flex-1">
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.steps} min={2} max={32} onChange={(v) => onUpdate({ steps: Math.round(v) })} size={20} label="Steps" />
          <Knob value={mod.pulses} min={1} max={mod.steps} onChange={(v) => onUpdate({ pulses: Math.round(v) })} size={20} label="Pulses" />
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Knob value={mod.rotation} min={0} max={mod.steps - 1} onChange={(v) => onUpdate({ rotation: Math.round(v) })} size={20} label="Rot" />
        </div>
        <span className="text-[9px] text-zinc-500 text-center">{mod.pulses}/{mod.steps}</span>
      </div>
    </ModuleShell>
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
        <div className="text-[10px]">Effects coming soon.</div>
      </div>
    </div>
  );
}
