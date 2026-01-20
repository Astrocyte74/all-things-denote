import { useRef, useEffect, type RefObject, useState } from 'react';

export interface UseTripleTapOptions {
  onTripleTap: () => void;
  tapThreshold?: number;
  timeThreshold?: number;
}

export function useTripleTap<T extends HTMLElement>({
  onTripleTap,
  tapThreshold = 3,
  timeThreshold = 500
}: UseTripleTapOptions): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const [, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTap = () => {
      setTapCount((prev) => {
        const newCount = prev + 1;

        // Clear existing timeout
        if (tapTimeoutRef.current !== null) {
          window.clearTimeout(tapTimeoutRef.current);
        }

        // Check if we've reached the threshold
        if (newCount === tapThreshold) {
          onTripleTap();
          tapTimeoutRef.current = window.setTimeout(() => setTapCount(0), timeThreshold);
          return 0;
        }

        // Reset count if no more taps within threshold
        tapTimeoutRef.current = window.setTimeout(() => setTapCount(0), timeThreshold);
        return newCount;
      });
    };

    element.addEventListener('click', handleTap);

    return () => {
      element.removeEventListener('click', handleTap);
      if (tapTimeoutRef.current !== null) {
        window.clearTimeout(tapTimeoutRef.current);
      }
    };
  }, [onTripleTap, tapThreshold, timeThreshold]);

  return ref;
}
