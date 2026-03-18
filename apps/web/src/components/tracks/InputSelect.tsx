import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { AudioDevice } from '@/hooks/useAudioDevices';

interface InputSelectProps {
  devices: AudioDevice[];
  value: string;
  onChange: (deviceId: string) => void;
}

export function InputSelect({ devices, value, onChange }: InputSelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const selected = devices.find((d) => d.deviceId === value);
  const label = selected ? truncate(selected.label, 14) : 'Default';

  // Position the portal menu relative to the button
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    setOpen(false);
  }, [onChange]);

  if (devices.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] transition-colors ${
          open ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800/80 text-zinc-500 hover:text-zinc-300'
        }`}
        title={selected?.label ?? 'System Default Input'}
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M5 1v5M3 3.5C2 4 1.5 5 1.5 6c0 1.5 1.5 3 3.5 3s3.5-1.5 3.5-3c0-1-.5-2-1.5-2.5" />
        </svg>
        <span className="truncate max-w-[60px]">{label}</span>
        <svg
          width="6" height="6" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1.5 3L4 5.5L6.5 3" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] w-48 max-h-52 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800 py-0.5 shadow-xl"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <DropdownItem
            label="System Default"
            selected={value === ''}
            onClick={() => handleSelect('')}
          />
          {devices.map((d) => (
            <DropdownItem
              key={d.deviceId}
              label={d.label}
              selected={d.deviceId === value}
              onClick={() => handleSelect(d.deviceId)}
            />
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function DropdownItem({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] transition-colors ${
        selected ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200'
      }`}
    >
      <span className={`flex-shrink-0 ${selected ? 'text-zinc-100' : 'text-transparent'}`}>
        <svg width="6" height="6" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4l2 2 4-4" />
        </svg>
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}
