/** Minimum sizes follow iOS HIG (44pt) and Material Design (48dp) guidance. */
export const touchTarget = {
  min: 44,
  comfortable: 48,
  large: 56,
} as const;

export type TouchTargetToken = keyof typeof touchTarget;
