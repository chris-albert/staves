import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { Knob } from '@staves/ui';
import { LevelMeter } from './LevelMeter';
import { DeviceSelect } from './DeviceSelect';
import type { AudioDevice } from '@/hooks/useAudioDevices';

interface MasterTrackProps {
  outputs: AudioDevice[];
  selectedOutputId: string;
  onSelectOutput: (deviceId: string) => void;
}

export function MasterTrack({ outputs, selectedOutputId, onSelectOutput }: MasterTrackProps) {
  const [volume, setVolume] = useState(1);
  const [pan, setPan] = useState(0);
  const [stereoLevel, setStereoLevel] = useState<[number, number]>([0, 0]);
  const rafRef = useRef(0);

  // Poll master bus stereo levels for metering
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      try {
        const engine = AudioEngine.getInstance();
        setStereoLevel(engine.masterBus.getStereoLevel());
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

  return (
    <div className="flex flex-shrink-0 flex-col overflow-hidden border-t border-zinc-700/80 bg-zinc-900/80">
      <div className="flex h-20 items-stretch">
        {/* Color bar — left */}
        <div className="w-1.5 flex-shrink-0 bg-zinc-400" />

        <div className="flex flex-1 flex-col gap-1.5 px-3 py-2">
          {/* Row 1: label + output selector */}
          <div className="flex items-center gap-1.5">
            <span className="flex-1 truncate text-[13px] font-medium text-zinc-300">
              Main
            </span>
            <DeviceSelect
              devices={outputs}
              value={selectedOutputId}
              onChange={onSelectOutput}
              kind="output"
            />
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
