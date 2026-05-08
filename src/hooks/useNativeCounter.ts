import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import NativeCounter from '../specs/NativeCounter';
import { HISTORY_LIMIT, type HistoryEntry } from './useCounter';

const INITIAL_HISTORY: HistoryEntry[] = [{ id: 0, value: 0 }];

export type NativeCounterApi = {
  value: number;
  history: HistoryEntry[];
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

export function useNativeCounter(): NativeCounterApi {
  const value = useSyncExternalStore(
    cb => {
      const sub = NativeCounter.onChange(() => cb());
      return () => sub.remove();
    },
    () => NativeCounter.getValue(),
  );

  // History is a UI-side derivation: we observe the canonical value from
  // native and track recent values for the strip. The native module is the
  // single source of truth for `value`; we don't try to reconstruct it.
  const [history, setHistory] = useState<HistoryEntry[]>(INITIAL_HISTORY);
  const idRef = useRef(1);

  useEffect(() => {
    setHistory(prev => {
      if (prev[0]?.value === value) return prev;
      const next = [{ id: idRef.current++, value }, ...prev];
      return next.length > HISTORY_LIMIT ? next.slice(0, HISTORY_LIMIT) : next;
    });
  }, [value]);

  return {
    value,
    history,
    increment: () => NativeCounter.increment(),
    decrement: () => NativeCounter.decrement(),
    reset: () => NativeCounter.reset(),
  };
}
