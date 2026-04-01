import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const Ctx = createContext(null);
export const useDragCtx = () => useContext(Ctx);

export default function DragProvider({ children, onDrop, onSort, onEventReorder }) {
  const [dragging, setDragging] = useState(null); // { type, data, x, y }
  const [overZone, setOverZone] = useState(null);
  const zonesRef = useRef(new Map()); // id -> { el, data }
  const sortZonesRef = useRef(new Map()); // id -> { el, data }
  const frameRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });

  const registerZone = useCallback((id, el, data) => {
    if (el) zonesRef.current.set(id, { el, data });
    else zonesRef.current.delete(id);
  }, []);

  const registerSortZone = useCallback((id, el, data) => {
    if (el) sortZonesRef.current.set(id, { el, data });
    else sortZonesRef.current.delete(id);
  }, []);

  const startDrag = useCallback((type, data, x, y) => {
    console.log('[DragProvider] startDrag', { type, data });
    setDragging({ type, data, x, y });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = e => {
      const x = e.clientX, y = e.clientY;
      posRef.current = { x, y };
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setDragging(d => d ? { ...d, x, y } : null);
        // Find hovered drop zone
        let found = null;
        for (const [id, { el }] of zonesRef.current) {
          const r = el.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            found = id; break;
          }
        }
        setOverZone(found);
      });
    };

    const onUp = e => {
      const x = e.clientX, y = e.clientY;
      cancelAnimationFrame(frameRef.current);

      console.log('mouseup', { x, y, zones: zonesRef.current.size, sortZones: sortZonesRef.current.size });
      console.log('dragging type:', dragging?.type);

      if (dragging.type === 'sort') {
        for (const [id, { el, data }] of sortZonesRef.current) {
          const r = el.getBoundingClientRect();
          console.log('sort zone', id, r, 'hit?', x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            onSort?.(dragging.data, data);
            break;
          }
        }
      } else {
        console.log('[onUp] checking', zonesRef.current.size, 'drop zones');
        for (const [id, { el, data }] of zonesRef.current) {
          const r = el.getBoundingClientRect();
          const hit = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
          console.log('[onUp] zone', id, hit ? '✅ HIT' : '❌');
          if (hit) {
            onDrop?.(dragging.data, data);
            break;
          }
        }
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
  }, [dragging, onDrop, onSort]);

  return (
    <Ctx.Provider value={{ dragging, overZone, startDrag, registerZone, registerSortZone }}>
      {children}
      {/* Ghost */}
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
            {dragging.data.name ?? dragging.data.preset?.name ?? 'Event'}
          </span>
        </div>
      )}
    </Ctx.Provider>
  );
}