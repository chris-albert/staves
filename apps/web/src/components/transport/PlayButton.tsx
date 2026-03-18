interface PlayButtonProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

export function PlayButton({ isPlaying, onPlay, onStop }: PlayButtonProps) {
  return (
    <button
      onClick={isPlaying ? onStop : onPlay}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        isPlaying
          ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
          : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
      }`}
      title={isPlaying ? 'Stop (Space)' : 'Play (Space)'}
    >
      {isPlaying ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <rect x="0" y="0" width="10" height="10" rx="1" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <polygon points="1,0 10,5 1,10" />
        </svg>
      )}
    </button>
  );
}
