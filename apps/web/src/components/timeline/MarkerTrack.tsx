import { useCallback, useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTransport } from '@/hooks/useTransport';

interface MarkerTrackProps {
  zoom: number;
  scrollLeft: number;
}

export function MarkerTrack({ zoom, scrollLeft }: MarkerTrackProps) {
  const markers = useProjectStore((s) => s.markers);
  const updateMarker = useProjectStore((s) => s.updateMarker);
  const removeMarker = useProjectStore((s) => s.removeMarker);
  const { seek } = useTransport();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      updateMarker(editingId, { name: editValue.trim() });
      // Persist rename to DB
      import('@staves/storage').then(({ projectRepository }) => {
        projectRepository.updateMarker(editingId, { name: editValue.trim() });
      });
    }
    setEditingId(null);
  }, [editingId, editValue, updateMarker]);

  return (
    <>
      {markers.map((marker) => {
        const x = marker.beat * zoom - scrollLeft;
        if (x < -100 || x > window.innerWidth + 100) return null;

        return (
          <div
            key={marker.id}
            className="absolute top-0 z-20 cursor-pointer group"
            style={{ left: x }}
            onClick={(e) => {
              e.stopPropagation();
              seek(marker.beat);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditValue(marker.name);
              setEditingId(marker.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeMarker(marker.id);
              // Also delete from DB
              import('@staves/storage').then(({ projectRepository }) => {
                projectRepository.deleteMarker(marker.id);
              });
            }}
          >
            {/* Marker flag */}
            <div
              className="flex items-center gap-0.5 rounded-b px-1.5 py-0.5 text-[10px] font-medium text-white whitespace-nowrap shadow-sm"
              style={{ backgroundColor: marker.color }}
            >
              {editingId === marker.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-16 bg-transparent text-[10px] text-white outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                marker.name
              )}
            </div>
            {/* Vertical line */}
            <div
              className="w-px opacity-60"
              style={{ backgroundColor: marker.color, height: '100vh' }}
            />
          </div>
        );
      })}
    </>
  );
}
