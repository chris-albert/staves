interface RecordButtonProps {
  isRecording: boolean;
  hasArmedTrack: boolean;
  onRecord: () => void;
  onStopRecord: () => void;
}

export function RecordButton({ isRecording, hasArmedTrack, onRecord, onStopRecord }: RecordButtonProps) {
  return (
    <button
      onClick={isRecording ? onStopRecord : onRecord}
      disabled={!isRecording && !hasArmedTrack}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        isRecording
          ? 'bg-red-600 text-white hover:bg-red-500'
          : hasArmedTrack
            ? 'text-red-400 hover:bg-zinc-700'
            : 'text-zinc-600 cursor-not-allowed'
      }`}
      title={
        isRecording ? 'Stop recording (R)' : hasArmedTrack ? 'Record (R)' : 'Arm a track first'
      }
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="4" fill="currentColor" />
      </svg>
    </button>
  );
}
