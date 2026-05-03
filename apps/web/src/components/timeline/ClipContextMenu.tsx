import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

interface MenuItem {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ClipContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ClipContextMenu({ x, y, items, onClose }: ClipContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[160px] rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl"
      style={{ top: y, left: x }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          disabled={item.disabled}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
            item.disabled
              ? 'text-zinc-600 cursor-not-allowed'
              : item.danger
                ? 'text-red-400 hover:bg-zinc-700'
                : 'text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="ml-4 text-[11px] text-zinc-500">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>,
    document.body,
  );
}
