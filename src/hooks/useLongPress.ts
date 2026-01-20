import { useState, useRef, useEffect, useCallback } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

export function useLongPress({ threshold = 700, onLongPress, onClick }: UseLongPressOptions) {
  const [isLongPress, setIsLongPress] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggered = useRef(false);

  const start = useCallback(() => {
    isLongPressTriggered.current = false;
    setIsLongPress(true);
    
    timerRef.current = setTimeout(() => {
      onLongPress();
      isLongPressTriggered.current = true;
      setIsLongPress(false);
    }, threshold);
  }, [onLongPress, threshold]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLongPress(false);
    
    if (!isLongPressTriggered.current && onClick) {
      onClick();
    }
  }, [onClick]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    isLongPress
  };
}
