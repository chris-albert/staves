import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, DRUM_KIT_BANKS } from '@staves/audio-engine';
import type { DrumPattern, Clip } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';
import { DraggablePanel } from '@/components/layout/DraggablePanel';

const STEP_OPTIONS = [8, 16, 32] as const;
const SPB_OPTIONS = [
  { label: '1/8', value: 2 },
  { label: '1/16', value: 4 },
  { label: '1/8T', value: 3 },
  { label: '1/32', value: 8 },
] as const;

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 32;
const CELL_WIDTH = 36;
const LABEL_WIDTH = 120;

interface StepSequencerProps {
  clip: Clip;
  pattern: DrumPattern;
}

export function StepSequencer({ clip, pattern }: StepSequencerProps) {
  const updateDrumPattern = useProjectStore((s) => s.updateDrumPattern);
  const updateClip = useProjectStore((s) => s.updateClip);
  const setEditingDrumClipId = useUiStore((s) => s.setEditingDrumClipId);
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  // Preview a pad sound
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

  // Toggle a step
  const toggleStep = useCallback(
    (padIndex: number, step: number) => {
      const existing = pattern.activeSteps.find(
        (s) => s.padIndex === padIndex && s.step === step,
      );
      const newSteps = existing
        ? pattern.activeSteps.filter((s) => !(s.padIndex === padIndex && s.step === step))
        : [...pattern.activeSteps, { padIndex, step, velocity: 1 }];
      updateDrumPattern(pattern.id, { activeSteps: newSteps });
    },
    [pattern.id, pattern.activeSteps, updateDrumPattern],
  );

  // Change step count
  const setSteps = useCallback(
    (steps: number) => {
      const filtered = pattern.activeSteps.filter((s) => s.step < steps);
      const newDuration = steps / pattern.stepsPerBeat;
      updateDrumPattern(pattern.id, { steps, activeSteps: filtered });
      updateClip(clip.id, {
        durationBeats: newDuration,
        sourceDurationBeats: newDuration,
      });
    },
    [pattern.id, pattern.stepsPerBeat, pattern.activeSteps, updateDrumPattern, clip.id, updateClip],
  );

  // Change steps per beat
  const setStepsPerBeat = useCallback(
    (stepsPerBeat: number) => {
      const newDuration = pattern.steps / stepsPerBeat;
      updateDrumPattern(pattern.id, { stepsPerBeat });
      updateClip(clip.id, {
        durationBeats: newDuration,
        sourceDurationBeats: newDuration,
      });
    },
    [pattern.id, pattern.steps, updateDrumPattern, clip.id, updateClip],
  );

  // Change pad sample
  const setPadSample = useCallback(
    (padIndex: number, sampleUrl: string, name: string) => {
      const newPads = pattern.pads.map((p) =>
        p.index === padIndex ? { ...p, sampleUrl, name } : p,
      );
      updateDrumPattern(pattern.id, { pads: newPads });
    },
    [pattern.id, pattern.pads, updateDrumPattern],
  );

  // Clear all steps
  const clearAll = useCallback(() => {
    updateDrumPattern(pattern.id, { activeSteps: [] });
  }, [pattern.id, updateDrumPattern]);

  // Active step lookup for fast grid rendering
  const activeSet = useRef(new Set<string>());
  activeSet.current = new Set(
    pattern.activeSteps.map((s) => `${s.padIndex}:${s.step}`),
  );

  // Calculate current step indicator
  const beatPerStep = 1 / pattern.stepsPerBeat;
  const patternDuration = pattern.steps * beatPerStep;
  const relativeBeat = currentBeat - clip.startBeat;
  const currentStep =
    isPlaying && relativeBeat >= 0 && relativeBeat < patternDuration
      ? Math.floor(relativeBeat / beatPerStep)
      : -1;

  const stepsPerGroup = pattern.stepsPerBeat;
  const gridWidth = pattern.steps * CELL_WIDTH;
  const panelWidth = LABEL_WIDTH + gridWidth + 24;
  const panelHeight = HEADER_HEIGHT + pattern.pads.length * ROW_HEIGHT + 40;

  const onClose = useCallback(() => setEditingDrumClipId(null), [setEditingDrumClipId]);

  const spbLabel = SPB_OPTIONS.find((o) => o.value === pattern.stepsPerBeat)?.label ?? `1/${pattern.stepsPerBeat}`;

  return (
    <DraggablePanel
      title="Step Sequencer"
      onClose={onClose}
      defaultWidth={Math.min(panelWidth, 900)}
      defaultHeight={Math.min(panelHeight, 500)}
      minWidth={400}
      minHeight={260}
    >
      <div
        className="flex h-full flex-col bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls bar */}
        <div className="flex items-center gap-4 px-3 py-1.5 text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/60 bg-zinc-900/60">
          <span className="text-[10px] text-zinc-500">{clip.name}</span>
          <div className="h-3.5 w-px bg-zinc-700/60" />
          <label className="flex items-center gap-1.5">
            <span className="text-zinc-500">Steps</span>
            <select
              value={pattern.steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500 text-[10px]"
            >
              {STEP_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-zinc-500">Grid</span>
            <select
              value={pattern.stepsPerBeat}
              onChange={(e) => setStepsPerBeat(Number(e.target.value))}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500 text-[10px]"
            >
              {SPB_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={clearAll}
            className="rounded px-1.5 py-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-[10px]"
          >
            Clear
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-zinc-600">{spbLabel} &middot; {pattern.steps} steps</span>
        </div>

        {/* Grid area */}
        <div className="flex flex-1 overflow-auto">
          {/* Left: pad labels */}
          <div className="flex-shrink-0 flex flex-col" style={{ width: LABEL_WIDTH }}>
            {/* Header spacer */}
            <div className="flex-shrink-0 border-b border-zinc-800/40" style={{ height: HEADER_HEIGHT }} />
            {/* Pad rows */}
            {pattern.pads.map((pad, idx) => (
              <PadConfig
                key={pad.index}
                pad={pad}
                rowIndex={idx}
                onPreview={previewPad}
                onChangeSample={setPadSample}
              />
            ))}
          </div>

          {/* Right: step grid */}
          <div className="flex-1 overflow-auto">
            {/* Step number header */}
            <div className="flex-shrink-0 border-b border-zinc-800/40 flex" style={{ height: HEADER_HEIGHT, width: gridWidth }}>
              {Array.from({ length: pattern.steps }, (_, i) => {
                const isBeatStart = i % stepsPerGroup === 0;
                const isCurrent = currentStep === i;
                const globalBeat = clip.startBeat + i / stepsPerGroup;
                const bar = Math.floor(globalBeat / 4) + 1;
                const beatInBar = Math.floor(globalBeat % 4) + 1;
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'text-white font-semibold bg-purple-500/20'
                        : isBeatStart
                          ? 'text-zinc-400 font-medium'
                          : 'text-zinc-600'
                    } ${isBeatStart ? 'border-l border-zinc-600/60' : 'border-l border-zinc-800/30'}`}
                    style={{ width: CELL_WIDTH }}
                  >
                    {isBeatStart ? `${bar}.${beatInBar}` : '\u00B7'}
                  </div>
                );
              })}
            </div>

            {/* Grid rows */}
            <div className="flex flex-col" style={{ width: gridWidth }}>
              {pattern.pads.map((pad, idx) => (
                <StepRow
                  key={pad.index}
                  padIndex={pad.index}
                  rowIndex={idx}
                  steps={pattern.steps}
                  stepsPerGroup={stepsPerGroup}
                  currentStep={currentStep}
                  activeSet={activeSet.current}
                  onToggle={toggleStep}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}

/* ---- Pad config row (left panel) ---- */

interface PadConfigProps {
  pad: { index: number; name: string; sampleUrl: string };
  rowIndex: number;
  onPreview: (sampleUrl: string) => void;
  onChangeSample: (padIndex: number, sampleUrl: string, name: string) => void;
}

function PadConfig({ pad, rowIndex, onPreview, onChangeSample }: PadConfigProps) {
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showSampleMenu) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      ) return;
      setShowSampleMenu(false);
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [showSampleMenu]);

  const isEven = rowIndex % 2 === 0;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 border-b border-zinc-800/20 ${
        isEven ? 'bg-zinc-900/40' : 'bg-zinc-950/60'
      }`}
      style={{ height: ROW_HEIGHT }}
    >
      <button
        onClick={() => onPreview(pad.sampleUrl)}
        className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0"
        title="Preview"
      >
        <svg width="7" height="8" viewBox="0 0 7 8" fill="currentColor">
          <path d="M0 0v8l7-4z" />
        </svg>
      </button>
      <div className="relative flex-1 min-w-0">
        <button
          ref={btnRef}
          onClick={() => setShowSampleMenu((v) => !v)}
          className="truncate text-[11px] text-zinc-300 hover:text-zinc-100 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors w-full text-left"
          title={pad.name}
        >
          {pad.name}
        </button>
        {showSampleMenu && (
          <div
            ref={menuRef}
            className="absolute left-0 bottom-full z-50 mb-1 max-h-48 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800 shadow-xl"
            style={{ minWidth: 160 }}
          >
            {DRUM_KIT_BANKS.map((bank) => (
              <div key={bank.id}>
                <div className="px-3 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900 sticky top-0">
                  {bank.name}
                </div>
                {bank.sounds.map((sound) => (
                  <button
                    key={sound.url}
                    onClick={() => {
                      onChangeSample(pad.index, sound.url, sound.name);
                      setShowSampleMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      sound.url === pad.sampleUrl
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {sound.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Step row (right panel grid) ---- */

interface StepRowProps {
  padIndex: number;
  rowIndex: number;
  steps: number;
  stepsPerGroup: number;
  currentStep: number;
  activeSet: Set<string>;
  onToggle: (padIndex: number, step: number) => void;
}

function StepRow({
  padIndex,
  rowIndex,
  steps,
  stepsPerGroup,
  currentStep,
  activeSet,
  onToggle,
}: StepRowProps) {
  const isEven = rowIndex % 2 === 0;

  return (
    <div
      className={`flex border-b border-zinc-800/20 ${
        isEven ? 'bg-zinc-900/40' : 'bg-zinc-950/60'
      }`}
      style={{ height: ROW_HEIGHT }}
    >
      {Array.from({ length: steps }, (_, i) => {
        const isActive = activeSet.has(`${padIndex}:${i}`);
        const isBeatStart = i % stepsPerGroup === 0;
        const isCurrentStep = currentStep === i;
        return (
          <button
            key={i}
            onClick={() => onToggle(padIndex, i)}
            className={`flex items-center justify-center transition-colors ${
              isBeatStart ? 'border-l border-zinc-600/60' : 'border-l border-zinc-800/30'
            } ${isCurrentStep ? 'bg-zinc-700/40' : ''}`}
            style={{ width: CELL_WIDTH, height: ROW_HEIGHT }}
          >
            <div
              className={`rounded transition-all ${
                isActive
                  ? 'bg-purple-400/85 border border-purple-600/60 shadow-sm shadow-purple-500/20'
                  : 'bg-zinc-800/70 border border-zinc-700/40 hover:bg-zinc-700/60 hover:border-zinc-600/50'
              }`}
              style={{ width: ROW_HEIGHT - 10, height: ROW_HEIGHT - 10 }}
            />
          </button>
        );
      })}
    </div>
  );
}
