import { useEffect } from "react";

/**
 * A thin, strictly-mount-only wrapper around React's useEffect.
 * Use this when you genuinely need to run a side-effect exactly once after the
 * component mounts, and never again on re-renders.
 */
export function useMountEffect(effect: () => void | (() => void)): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
