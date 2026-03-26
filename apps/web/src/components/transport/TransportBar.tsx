import { PlayButton } from './PlayButton';
import { RecordButton } from './RecordButton';
import { BpmControl } from './BpmControl';
import { TimeDisplay } from './TimeDisplay';
import { useTransport } from '@/hooks/useTransport';

interface TransportBarProps {
  isRecording: boolean;
  hasArmedTrack: boolean;
  onRecord: () => void;
  onStopRecord: () => void;
}

export function TransportBar({ isRecording, hasArmedTrack, onRecord, onStopRecord }: TransportBarProps) {
  const { isPlaying, play, stop, bpm, setBpm, loopEnabled, toggleLoop, metronomeEnabled, toggleMetronome } = useTransport();

  // When recording, stop button should stop recording (which also stops transport)
  const handleStop = isRecording ? onStopRecord : stop;

  return (
    <div className="flex items-center gap-1">
      {/* Transport controls group */}
      <div className="flex items-center rounded-lg bg-zinc-800/60 p-0.5 gap-0.5">
        <PlayButton isPlaying={isPlaying} onPlay={play} onStop={handleStop} />
        <RecordButton
          isRecording={isRecording}
          hasArmedTrack={hasArmedTrack}
          onRecord={onRecord}
          onStopRecord={onStopRecord}
        />
      </div>

      {/* Toggle buttons group */}
      <div className="flex items-center rounded-lg bg-zinc-800/60 p-0.5 gap-0.5 ml-1">
        <button
          onClick={toggleMetronome}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            metronomeEnabled ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={metronomeEnabled ? 'Metronome on' : 'Metronome off'}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M3 11L5 1h2l2 10" />
            <path d="M6 4l3-2" />
            <path d="M2.5 11h7" />
          </svg>
        </button>
        <button
          onClick={toggleLoop}
          className={`flex h-7 items-center justify-center rounded px-1.5 text-[10px] font-semibold tracking-wide transition-colors ${
            loopEnabled ? 'bg-amber-600/80 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={loopEnabled ? 'Loop on' : 'Loop off'}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2l2 2-2 2" />
            <path d="M4 12l-2-2 2-2" />
            <path d="M12 4H5a3 3 0 00-3 3" />
            <path d="M2 10h7a3 3 0 003-3" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-1.5 h-5 w-px bg-zinc-800" />

      {/* Time + BPM */}
      <TimeDisplay />
      <div className="mx-1 h-5 w-px bg-zinc-800" />
      <BpmControl bpm={bpm} onChange={setBpm} />

      {/* Recording indicator — always rendered to prevent layout shift */}
      <div className={`ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-opacity ${
        isRecording ? 'bg-red-950/60 opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-[10px] font-semibold tracking-wider text-red-400">REC</span>
      </div>
    </div>
  );
}
