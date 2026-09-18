/** Durations in milliseconds, kept short so interactions feel fast. */
export const duration = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** Standard Material-style easing curves, usable as CSS strings or RN Easing bezier args. */
export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  decelerate: [0, 0, 0, 1] as const,
  accelerate: [0.3, 0, 1, 1] as const,
};

export type DurationToken = keyof typeof duration;
