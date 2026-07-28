import { useCallback } from 'react';
import { useDragCtx } from './DragContext';

export function useDrag(type, data) {
  const ctx = useDragCtx();

  const onMouseDown = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    ctx?.startDrag(type, data, e.clientX, e.clientY);
  }, [type, data, ctx]);

  // Touch equivalent — mobile devices don't fire usable mouse events for drags.
  const onTouchStart = useCallback(e => {
    e.stopPropagation();
    const t = e.touches[0];
    if (!t) return;
    ctx?.startDrag(type, data, t.clientX, t.clientY);
  }, [type, data, ctx]);

  const isDragging = false; // never dim — let DragContext ghost handle visual feedback

  return { onMouseDown, onTouchStart, isDragging };
}