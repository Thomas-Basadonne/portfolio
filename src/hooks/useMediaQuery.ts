import { useCallback, useSyncExternalStore } from "react";

/** Whether a media query matches now, re-rendering when it changes (false where matchMedia is missing). */
export function useMediaQuery(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const list = window.matchMedia?.(query);
    list?.addEventListener("change", onChange);
    return () => list?.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? false, () => false);
}
