import { useRef } from 'react';

/**
 * Dev-only render counter. Logs each render to verify memoization. No-op in
 * production builds.
 */
export function useRenderCount(label: string): number {
  const ref = useRef(0);
  ref.current += 1;
  if (__DEV__) {
    console.log(`[render] ${label} #${ref.current}`);
  }
  return ref.current;
}
