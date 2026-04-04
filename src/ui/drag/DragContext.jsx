import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const Ctx = createContext(null);
export const useDragCtx = () => useContext(Ctx);

export default function DragProvider({ children, onDrop, onSort, onEventReorder }) {
  const [dragging, setDragging] = useState(null);
  const [overZone, setOverZone] = useState(null);
  const zonesRef = useRef(new Map());
  const sortZonesRef = useRef(new Map());
  const frameRef = useRef(null);

  const registerZone = useCallback((id, el, data) => {
    if (el) zonesRef.current.set(id, { el, data });
    else zonesRef.current.delete(id);
  }, []);

  const registerSortZone = useCallback((id, el, data) => {
    if (el) sortZonesRef.current.set(id, { el, data });
    else sortZonesRef.current.delete(id);
  }, []);

  const startDrag = useCallback((type, data, x, y) => {
    setDragging({ type, data, x, y });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const hitTest = (map, x, y) => {
      for (const [id, { el, data }] of map) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return data;
      }
      return null;
    };

    const onMove = e => {
      const x = e.clientX, y = e.clientY;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setDragging(d => d ? { ...d, x, y } : null);
        let found = null;
        for (const [id, { el }] of zonesRef.current) {
          const r = el.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { found = id; break; }
        }
        setOverZone(found);
      });
    };

    const onUp = e => {
      const x = e.clientX, y = e.clientY;
      cancelAnimationFrame(frameRef.current);

      if (dragging.type === 'sort') {
        // Preset library reorder
        const target = hitTest(sortZonesRef.current, x, y);
        if (target) onSort?.(dragging.data, target);
      } else if (dragging.type === 'event-sort') {
        // Event reorder within a day
        const target = hitTest(sortZonesRef.current, x, y);
        if (target) onEventReorder?.(dragging.data, target);
      } else {
        // Preset/event drop onto a day
        const target = hitTest(zonesRef.current, x, y);
        if (target) onDrop?.(dragging.data, target);
      }

      setDragging(null);
      setOverZone(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, [dragging, onDrop, onSort, onEventReorder]);

  return (
    <Ctx.Provider value={{ dragging, overZone, startDrag, registerZone, registerSortZone }}>
      {children}
      {dragging && (
        <div style={{
          position: 'fixed',
          left: dragging.x + 12,
          top: dragging.y - 20,
          zIndex: 99999,
          pointerEvents: 'none',
          background: '#fff8ee',
          border: `1.5px solid ${dragging.data.color ?? '#b8860b'}`,
          borderLeft: `4px solid ${dragging.data.color ?? '#b8860b'}`,
          borderRadius: 10,
          padding: '8px 14px',
          boxShadow: '0 8px 24px rgba(92,61,30,0.25)',
          fontSize: 13, fontWeight: 600, color: '#3d2408',
          display: 'flex', alignItems: 'center', gap: 8,
          maxWidth: 220, minWidth: 140,
          opacity: 0.95,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dragging.data.color ?? '#b8860b', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dragging.data.name ?? dragging.data.event?.name ?? 'Event'}
          </span>
        </div>
      )}
    </Ctx.Provider>
  );
}