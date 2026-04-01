import { useUiStore } from '@/stores/uiStore';

const SNAP_OPTIONS: { label: string; division: number | null }[] = [
  { label: 'None', division: null },
  { label: '1/4', division: 1 },
  { label: '1/8', division: 0.5 },
  { label: '1/16', division: 0.25 },
];

export function SnapControl() {
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapDivision = useUiStore((s) => s.snapDivision);
  const setSnapEnabled = useUiStore((s) => s.setSnapEnabled);
  const setSnapDivision = useUiStore((s) => s.setSnapDivision);

  // The active option: null division = snap off, otherwise match division
  const activeDivision = snapEnabled ? snapDivision : null;

  function select(division: number | null) {
    if (division === null) {
      setSnapEnabled(false);
    } else {
      setSnapEnabled(true);
      setSnapDivision(division);
    }
  }

  return (
    <div className="flex items-center rounded-lg bg-zinc-800/60 p-0.5 gap-px">
      {SNAP_OPTIONS.map((opt) => {
        const active = opt.division === activeDivision;
        return (
          <button
            key={opt.label}
            onClick={() => select(opt.division)}
            className={`h-7 rounded px-1.5 font-mono text-[10px] transition-colors ${
              active
                ? 'bg-zinc-600 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={opt.division === null ? 'No snap' : `Snap to ${opt.label} note`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
