import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, DRUM_KIT_BANKS } from '@staves/audio-engine';
import type { DrumPattern, Clip } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useTransportStore } from '@/stores/transportStore';

const STEP_OPTIONS = [8, 16, 32] as const;
const SPB_OPTIONS = [
  { label: '1/8', value: 2 },
  { label: '1/16', value: 4 },
  { label: '1/8T', value: 3 },
  { label: '1/32', value: 8 },
] as const;

const PANEL_HEIGHT = 340;

interface StepSequencerProps {
  clip: Clip;
  pattern: DrumPattern;
}

export function StepSequencer({ clip, pattern }: StepSequencerProps) {
  const updateDrumPattern = useProjectStore((s) => s.updateDrumPattern);
  const updateClip = useProjectStore((s) => s.updateClip);
  const setEditingDrumClipId = useUiStore((s) => s.setEditingDrumClipId);
  const zoom = useUiStore((s) => s.zoom);
  const scrollLeft = useUiStore((s) => s.scrollLeft);
  const setScrollLeft = useUiStore((s) => s.setScrollLeft);
  const currentBeat = useTransportStore((s) => s.currentBeat);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const gridRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEditingDrumClipId(null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setEditingDrumClipId]);

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

  // Pixel width of each step cell — must exactly match timeline scale
  const cellWidth = zoom / pattern.stepsPerBeat;

  // Offset of the clip's start position in timeline pixels
  const clipOffsetPx = clip.startBeat * zoom;
  // Total width of the grid content
  const gridContentWidth = pattern.steps * cellWidth + clipOffsetPx;

  // Sync horizontal scroll: forward wheel events to the shared scrollLeft
  const scrollLeftRef = useRef(scrollLeft);
  scrollLeftRef.current = scrollLeft;

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        setScrollLeft(scrollLeftRef.current + e.deltaX);
      } else if (e.shiftKey) {
        e.preventDefault();
        setScrollLeft(scrollLeftRef.current + e.deltaY);
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setScrollLeft]);

  return (
    <div
      className="flex bg-zinc-900"
      style={{ height: PANEL_HEIGHT }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left panel — aligned with track list sidebar (w-60 = 240px) */}
      <div className="w-60 flex-shrink-0 flex flex-col border-r border-zinc-800/80">
        {/* Header — same height as step number header on the right (26px) */}
        <div className="flex items-center gap-2 px-3 h-[26px] text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/50">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sequencer</span>
          <div className="flex-1" />
          <button
            onClick={() => setEditingDrumClipId(null)}
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            title="Close (Esc)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        </div>

        {/* Pad list — sound configuration, rows aligned with grid rows */}
        <div className="flex flex-col flex-shrink-0 overflow-y-auto">
          {pattern.pads.map((pad) => (
            <PadConfig
              key={pad.index}
              pad={pad}
              onPreview={previewPad}
              onChangeSample={setPadSample}
            />
          ))}
        </div>

        {/* Pattern controls — pushed to bottom */}
        <div className="mt-auto flex items-center gap-3 px-3 py-1.5 text-xs text-zinc-400 flex-shrink-0 border-t border-zinc-800/50">
          <label className="flex items-center gap-1">
            Steps
            <select
              value={pattern.steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500 text-[10px]"
            >
              {STEP_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Grid
            <select
              value={pattern.stepsPerBeat}
              onChange={(e) => setStepsPerBeat(Number(e.target.value))}
              className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200 outline-none ring-1 ring-zinc-700 focus:ring-zinc-500 text-[10px]"
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
        </div>
      </div>

      {/* Right panel — step grid, scroll-synced with timeline */}
      <div
        ref={gridRef}
        className="flex-1 flex flex-col overflow-hidden overflow-y-auto"
      >
        {/* Step number header */}
        <div className="flex-shrink-0 h-[26px] overflow-hidden border-b border-zinc-800/50">
          <div className="relative h-full" style={{ width: gridContentWidth }}>
            <div
              className="absolute top-0 flex items-end h-full"
              style={{ left: clipOffsetPx - scrollLeft }}
            >
              {Array.from({ length: pattern.steps }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-4 items-center justify-center text-[9px] ${
                    i % stepsPerGroup === 0 ? 'text-zinc-400 font-medium' : 'text-zinc-600'
                  } ${currentStep === i ? 'text-white' : ''}`}
                  style={{ width: cellWidth }}
                >
                  {i % stepsPerGroup === 0 ? i / stepsPerGroup + 1 : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid rows */}
        <div className="flex flex-col flex-shrink-0">
          {pattern.pads.map((pad) => (
            <StepRow
              key={pad.index}
              padIndex={pad.index}
              steps={pattern.steps}
              stepsPerGroup={stepsPerGroup}
              currentStep={currentStep}
              activeSet={activeSet.current}
              onToggle={toggleStep}
              cellWidth={cellWidth}
              clipOffsetPx={clipOffsetPx}
              scrollLeft={scrollLeft}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Pad config row (left panel) ---- */

interface PadConfigProps {
  pad: { index: number; name: string; sampleUrl: string };
  onPreview: (sampleUrl: string) => void;
  onChangeSample: (padIndex: number, sampleUrl: string, name: string) => void;
}

function PadConfig({ pad, onPreview, onChangeSample }: PadConfigProps) {
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

  return (
    <div className="flex items-center gap-1 px-2 h-[22px] border-b border-zinc-800/30">
      <button
        onClick={() => onPreview(pad.sampleUrl)}
        className="flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0"
        title="Preview"
      >
        <svg width="6" height="7" viewBox="0 0 7 8" fill="currentColor">
          <path d="M0 0v8l7-4z" />
        </svg>
      </button>
      <div className="relative flex-1 min-w-0">
        <button
          ref={btnRef}
          onClick={() => setShowSampleMenu((v) => !v)}
          className="truncate text-[10px] text-zinc-300 hover:text-zinc-100 px-1 py-0.5 rounded hover:bg-zinc-800 transition-colors w-full text-left"
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
                <div className="px-3 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-850 sticky top-0">
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
  steps: number;
  stepsPerGroup: number;
  currentStep: number;
  activeSet: Set<string>;
  onToggle: (padIndex: number, step: number) => void;
  cellWidth: number;
  clipOffsetPx: number;
  scrollLeft: number;
}

function StepRow({
  padIndex,
  steps,
  stepsPerGroup,
  currentStep,
  activeSet,
  onToggle,
  cellWidth,
  clipOffsetPx,
  scrollLeft,
}: StepRowProps) {
  return (
    <div className="relative h-[22px] overflow-hidden">
      <div
        className="absolute top-0 flex"
        style={{ left: clipOffsetPx - scrollLeft }}
      >
        {Array.from({ length: steps }, (_, i) => {
          const isActive = activeSet.has(`${padIndex}:${i}`);
          const isBeatStart = i % stepsPerGroup === 0;
          const isCurrentStep = currentStep === i;
          // Scale the toggle dot proportionally, capped to row height
          const dotSize = Math.min(Math.max(cellWidth * 0.65, 4), 18);
          return (
            <button
              key={i}
              onClick={() => onToggle(padIndex, i)}
              className={`flex h-[22px] items-center justify-center border-l transition-colors ${
                isBeatStart ? 'border-zinc-600' : 'border-zinc-800'
              } ${isCurrentStep ? 'bg-zinc-700/60' : ''}`}
              style={{ width: cellWidth }}
            >
              <div
                className={`rounded-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
                style={{ width: dotSize, height: dotSize }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
