import { useCallback, useLayoutEffect, useRef } from "react";

// A retained editor can resume without remounting. Work started before suspension
// must stay cancelled even if the same account becomes active again.
export function useActiveOperation(active: boolean) {
  const scope = useRef({ active: false, generation: 0 });
  useLayoutEffect(() => {
    scope.current = { active, generation: scope.current.generation + 1 };
    return () => { scope.current = { active: false, generation: scope.current.generation + 1 }; };
  }, [active]);
  return useCallback(() => {
    const generation = scope.current.generation;
    return () => scope.current.active && scope.current.generation === generation;
  }, []);
}
