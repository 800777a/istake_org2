import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to provide a remount key that only changes when the window width changes.
 * This satisfies AGENTS.md Rule 4.2 (Orientation & Hard Reset) while avoiding 
 * re-mounts triggered by mobile keyboard popups (height-only resize).
 */
export const useRemountOnResize = () => {
  const [remountKey, setRemountKey] = useState(0);
  const prevWidth = useRef(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // Only increment key if width actually changed (ignoring height-only changes from keyboard)
      if (currentWidth !== prevWidth.current) {
        prevWidth.current = currentWidth;
        setRemountKey(k => k + 1);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return remountKey;
};
