import { useEffect, useState } from 'react';
import type { Unsubscribe } from '../../../shared/api';

/**
 * Loads a value once and keeps it fresh from a change event.
 * Returns null until the first load finishes.
 */
export function useLive<T>(
  load: () => Promise<T>,
  subscribe: (listener: (value: T) => void) => Unsubscribe,
): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let active = true;
    void load().then((initial) => {
      if (active) setValue(initial);
    });
    const unsubscribe = subscribe((next) => {
      setValue(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load, subscribe]);
  return value;
}
