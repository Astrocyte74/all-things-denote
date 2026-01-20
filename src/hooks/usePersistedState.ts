import { useState, useCallback, useEffect } from 'react';

// Helper to handle Set serialization
function toStoredValue<T>(value: T): string {
  if (value instanceof Set) {
    return JSON.stringify(Array.from(value));
  }
  return JSON.stringify(value);
}

function fromStoredValue<T>(stored: string, defaultValue: T): T {
  try {
    const parsed = JSON.parse(stored);
    // If default value is a Set, convert array back to Set
    if (defaultValue instanceof Set) {
      return new Set(parsed) as T;
    }
    return parsed;
  } catch {
    return defaultValue;
  }
}

export function usePersistedState<T>(key: string, defaultValue: T): [T, (newValue: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      return stored ? fromStoredValue(stored, defaultValue) : defaultValue;
    }
    return defaultValue;
  });

  const setPersistedValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev: T) => {
      const finalValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
      localStorage.setItem(key, toStoredValue(finalValue));
      return finalValue;
    });
  }, [key]);

  const clearValue = useCallback(() => {
    localStorage.removeItem(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue === null) {
          setValue(defaultValue);
        } else {
          setValue(fromStoredValue(e.newValue, defaultValue));
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, defaultValue]);

  return [value, setPersistedValue, clearValue];
}
