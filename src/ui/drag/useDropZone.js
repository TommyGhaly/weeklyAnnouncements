import { useRef, useEffect, useCallback } from 'react';
import { useDragCtx } from './DragContext';

export function useDropZone(id, data) {
  const { registerZone, overZone, dragging } = useDragCtx();
  const ref = useRef(null);
  const isOver = overZone === id && !!dragging;

  const setRef = useCallback(el => {
    ref.current = el;
    registerZone(id, el, data);
  }, [id, data, registerZone]);

  useEffect(() => () => registerZone(id, null, null), [id, registerZone]);

  return { ref: setRef, isOver };
}