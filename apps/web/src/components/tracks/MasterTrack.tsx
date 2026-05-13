import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { Knob } from '@staves/ui';
import { LevelMeter } from './LevelMeter';
import { DeviceSelect } from './DeviceSelect';
import type { AudioDevice } from '@/hooks/useAudioDevices';
import { useTransportStore } from '@/stores/transportStore';

const DETAIL_HEIGHT = 120;

interface MasterTrackProps {
  outputs: AudioDevice[];
  selectedOutputId: string;
  onSelectOutput: (deviceId: string) => void;
}

export function MasterTrack({ outputs, selectedOutputId, onSelectOutput }: MasterTrackProps) {
  const [volume, setVolume] = useState(1);
  const [pan, setPan] = useState(0);
  const [stereoLevel, setStereoLevel] = useState<[number, number]>([0, 0]);
  const [expanded, setExpanded] = useState(false);
  const rafRef = useRef(0);

  // Metronome state
  const metronomeEnabled = useTransportStore((s) => s.metronomeEnabled);
  const setMetronomeEnabled = useTransportStore((s) => s.setMetronomeEnabled);
  const [metronomeVolume, setMetronomeVolume] = useState(0.5);
  const [metronomeLevel, setMetronomeLevel] = useState(0);

  // Poll master bus stereo levels + metronome level for metering
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      try {
        const engine = AudioEngine.getInstance();
        setStereoLevel(engine.masterBus.getStereoLevel());
        setMetronomeLevel(engine.metronome.getLevel());
      } catch { /* engine not ready */ }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    try {
      const engine = AudioEngine.getInstance();
      engine.masterBus.volume = v;
    } catch { /* engine not ready */ }
  }, []);

  const handlePanChange = useCallback((v: number) => {
    setPan(v);
    try {
      const engine = AudioEngine.getInstance();
      engine.masterBus.pan = v;
    } catch { /* engine not ready */ }
  }, []);

  const handleMetronomeVolumeChange = useCallback((v: number) => {
    setMetronomeVolume(v);
    try {
      const engine = AudioEngine.getInstance();
      engine.metronome.volume = v;
    } catch { /* engine not ready */ }
  }, []);

  const toggleMetronome = useCallback(() => {
    const next = !metronomeEnabled;
    setMetronomeEnabled(next);
    try {
      const engine = AudioEngine.getInstance();
      engine.metronome.enabled = next;
    } catch { /* engine not ready */ }
  }, [metronomeEnabled, setMetronomeEnabled]);

  return (
    <div className="flex flex-shrink-0 flex-col overflow-hidden border-t border-zinc-700/80 bg-zinc-900/80">
      {/* Detail panel — renders above the header */}
      {expanded && (
        <div
          className="border-b border-zinc-800/40 bg-zinc-950"
          style={{ height: DETAIL_HEIGHT }}
        >
          <MasterDetailSidebar
            outputs={outputs}
            selectedOutputId={selectedOutputId}
            onSelectOutput={onSelectOutput}
            metronomeEnabled={metronomeEnabled}
            toggleMetronome={toggleMetronome}
            metronomeVolume={metronomeVolume}
            onMetronomeVolumeChange={handleMetronomeVolumeChange}
            metronomeLevel={metronomeLevel}
            onClose={() => setExpanded(false)}
          />
        </div>
      )}

      {/* Main header row */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input, select')) return;
          setExpanded((v) => !v);
        }}
        className={`flex h-20 items-stretch cursor-pointer transition-colors ${
          expanded ? 'bg-zinc-800/70' : 'hover:bg-zinc-900/50'
        }`}
      >
        {/* Color bar — left */}
        <div className="w-1.5 flex-shrink-0 bg-zinc-400" />

        <div className="flex flex-1 flex-col gap-1.5 px-3 py-2">
          {/* Row 1: label */}
          <div className="flex items-center gap-1.5">
            <span className="flex-1 truncate text-[13px] font-medium text-zinc-300">
              Main
            </span>
          </div>

          {/* Row 2: controls */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <Knob
                value={volume}
                min={0}
                max={1}
                onChange={handleVolumeChange}
                size={18}
                label="Vol"
              />
              <Knob
                value={pan}
                min={-1}
                max={1}
                onChange={handlePanChange}
                size={18}
                label="Pan"
              />
            </div>
          </div>
        </div>

        {/* Level meter — right edge */}
        <LevelMeter levelL={stereoLevel[0]} levelR={stereoLevel[1]} />
      </div>
    </div>
  );
}

/** The expanded detail sidebar content (rendered in the w-60 sidebar) */
function MasterDetailSidebar({
  outputs,
  selectedOutputId,
  onSelectOutput,
  metronomeEnabled,
  toggleMetronome,
  metronomeVolume,
  onMetronomeVolumeChange,
  metronomeLevel,
  onClose,
}: {
  outputs: AudioDevice[];
  selectedOutputId: string;
  onSelectOutput: (deviceId: string) => void;
  metronomeEnabled: boolean;
  toggleMetronome: () => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (v: number) => void;
  metronomeLevel: number;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header with close button */}
      <div className="flex items-center gap-2 px-3 h-[26px] text-xs text-zinc-400 flex-shrink-0 border-b border-zinc-800/50">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 bg-zinc-400"
        />
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">
          Main
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors flex-shrink-0"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-3 px-3 py-3">
        {/* Output */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">Out</span>
          <DeviceSelect
            devices={outputs}
            value={selectedOutputId}
            onChange={onSelectOutput}
            kind="output"
          />
        </div>

        {/* Metronome */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMetronome}
            className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold transition-colors ${
              metronomeEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={metronomeEnabled ? 'Disable metronome' : 'Enable metronome'}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 0L9 10H1L5 0Z" />
            </svg>
          </button>
          <span className="text-[10px] text-zinc-500">Met</span>
          <Knob
            value={metronomeVolume}
            min={0}
            max={1}
            onChange={onMetronomeVolumeChange}
            size={18}
            label="Vol"
          />
          <LevelMeter levelL={metronomeLevel} levelR={metronomeLevel} />
        </div>
      </div>
    </div>
  );
}

export { DETAIL_HEIGHT as MASTER_DETAIL_HEIGHT };
