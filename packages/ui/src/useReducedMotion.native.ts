import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Tracks the OS-level "reduce motion" accessibility setting. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (isMounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
