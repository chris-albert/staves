import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface DraggablePanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export function DraggablePanel({
  title,
  onClose,
  children,
  defaultWidth = 720,
  defaultHeight = 420,
  minWidth = 400,
  minHeight = 280,
}: DraggablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Center on mount
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, Math.round((window.innerWidth - defaultWidth) / 2)),
    y: Math.max(44, Math.round((window.innerHeight - defaultHeight) / 2)),
  }));
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // Drag handling
  const onDragStart = useCallback((e: React.PointerEvent) => {
    // Don't drag if clicking a button
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [pos.x, pos.y]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const nx = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offset.current.y));
    setPos({ x: nx, y: ny });
  }, []);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  // Resize handling
  const onResizeStart = useCallback((e: React.PointerEvent) => {
    resizing.current = true;
    offset.current = { x: e.clientX - size.w, y: e.clientY - size.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }, [size.w, size.h]);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizing.current) return;
    const nw = Math.max(minWidth, e.clientX - offset.current.x);
    const nh = Math.max(minHeight, e.clientY - offset.current.y);
    setSize({ w: nw, h: nh });
  }, [minWidth, minHeight]);

  const onResizeEnd = useCallback(() => {
    resizing.current = false;
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/60"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
    >
      {/* Title bar — drag handle */}
      <div
        className="flex h-9 flex-shrink-0 cursor-grab items-center justify-between border-b border-zinc-800 bg-zinc-800/80 px-3 select-none active:cursor-grabbing"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      >
        <span className="text-xs font-semibold text-zinc-300">{title}</span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-zinc-600">
          <path d="M14 4l-10 10M14 8l-6 6M14 12l-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
