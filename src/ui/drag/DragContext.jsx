import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const Ctx = createContext(null);
export const useDragCtx = () => useContext(Ctx);

export default function DragProvider({ children, onDrop, onSort, onEventReorder }) {
  const [dragging, setDragging] = useState(null);
  const [overZone, setOverZone] = useState(null);   // day zone id being hovered
  const [overSort, setOverSort] = useState(null);   // { id, position: 'before'|'after' }
  const zonesRef     = useRef(new Map());
  const sortZonesRef = useRef(new Map());
  const frameRef     = useRef(null);

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

    const moveAt = (x, y) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setDragging(d => d ? { ...d, x, y } : null);

        // Day zone highlight — always track regardless of drag type
        let foundZone = null;
        for (const [id, { el }] of zonesRef.current) {
          const r = el.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            foundZone = id;
            break;
          }
        }
        setOverZone(foundZone);

        // Sort indicator — for both within-day reorder AND cross-day event drags
        const t = dragging.type;
        if (t === 'event-sort' || t === 'sort') {
          let foundSort = null;
          for (const [id, { el }] of sortZonesRef.current) {
            const r = el.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
              const mid = r.top + r.height / 2;
              foundSort = { id, position: y < mid ? 'before' : 'after' };
              break;
            }
          }
          setOverSort(foundSort);
        } else {
          setOverSort(null);
        }
      });
    };

    const upAt = (x, y) => {
      cancelAnimationFrame(frameRef.current);

      const sortTarget = hitTest(sortZonesRef.current, x, y);
      const dayTarget  = hitTest(zonesRef.current, x, y);

      if (dragging.type === 'event-sort') {
        if (sortTarget) onEventReorder?.(dragging.data, sortTarget);
        else if (dayTarget) onDrop?.(dragging.data, dayTarget);
      } else if (dragging.type === 'sort') {
        if (sortTarget) onSort?.(dragging.data, sortTarget);
      } else {
        if (dayTarget) onDrop?.(dragging.data, dayTarget);
      }

      setDragging(null);
      setOverZone(null);
      setOverSort(null);
    };

    const onMouseMove = e => moveAt(e.clientX, e.clientY);
    const onMouseUp   = e => upAt(e.clientX, e.clientY);
    const onTouchMove = e => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault(); // stop the page scrolling while a drag is in progress
      moveAt(t.clientX, t.clientY);
    };
    const onTouchEnd = e => {
      const t = e.changedTouches[0];
      if (t) upAt(t.clientX, t.clientY);
      else { setDragging(null); setOverZone(null); setOverSort(null); }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      cancelAnimationFrame(frameRef.current);
    };
  }, [dragging, onDrop, onSort, onEventReorder]);

  // Expose overZone id so day cards can highlight themselves
  return (
    <Ctx.Provider value={{ dragging, overZone, overSort, startDrag, registerZone, registerSortZone }}>
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
            {dragging.data.name ?? dragging.data.event?.name ?? dragging.data.preset?.name ?? 'Event'}
          </span>
        </div>
      )}
    </Ctx.Provider>
  );
}