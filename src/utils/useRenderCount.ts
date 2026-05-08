import { useEffect, useRef } from 'react';

export function useRenderCount(label: string): number {
  const ref = useRef(0);
  ref.current += 1;
  // Log after commit so we don't side-effect during render. Strict Mode's
  // double-render in dev makes in-render logging misleading.
  useEffect(() => {
    if (__DEV__) {
      console.log(`[render] ${label} #${ref.current}`);
    }
  });
  return ref.current;
}
