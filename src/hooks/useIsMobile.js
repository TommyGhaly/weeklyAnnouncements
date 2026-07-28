import { useState, useEffect } from 'react';

// Returns true when the viewport is at or below `breakpoint` px wide.
// Used to gate mobile-only style overrides — desktop rendering is untouched.
export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = e => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
