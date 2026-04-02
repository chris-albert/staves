import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { Knob } from '@staves/ui';
import { LevelMeter } from './LevelMeter';
import { useTransport } from '@/hooks/useTransport';

export function MetronomeTrack() {
  const { metronomeEnabled, toggleMetronome } = useTransport();
  const [volume, setVolume] = useState(0.5);
  const [level, setLevel] = useState(0);
  const rafRef = useRef(0);

  // Poll metronome level for metering
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      try {
        const engine = AudioEngine.getInstance();
        setLevel(engine.metronome.getLevel());
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
      engine.metronome.volume = v;
    } catch { /* engine not ready */ }
  }, []);

  return (
    <div className="flex flex-shrink-0 flex-col overflow-hidden border-t border-zinc-700/80 bg-zinc-900/80">
      <div className="flex h-10 items-stretch">
        {/* Color bar */}
        <div className="w-1.5 flex-shrink-0 bg-zinc-500" />

        <div className="flex flex-1 items-center gap-2 px-3">
          {/* Enable toggle */}
          <button
            onClick={toggleMetronome}
            className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold transition-colors ${
              metronomeEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title={metronomeEnabled ? 'Disable metronome' : 'Enable metronome'}
          >
            {/* Metronome icon — simple triangle/pendulum shape */}
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 0L9 10H1L5 0Z" />
            </svg>
          </button>

          <span className="truncate text-[11px] font-medium text-zinc-400">
            Metronome
          </span>

          <Knob
            value={volume}
            min={0}
            max={1}
            onChange={handleVolumeChange}
            size={16}
            label="Vol"
          />
        </div>

        {/* Level meter — mono signal shown on both channels */}
        <LevelMeter levelL={level} levelR={level} />
      </div>
    </div>
  );
}
