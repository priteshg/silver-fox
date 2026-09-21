/**
 * Only device-local state lives in AsyncStorage now — everything else (the
 * exercise library, programmes, workout history, activity logs, the active
 * programme) moved to Postgres when Supabase was introduced. See
 * docs/architecture.md's "Inside apps/mobile" section for why these two
 * specifically stay local rather than syncing.
 */
export const STORAGE_KEYS = {
  activeSession: "silverfox:activeSession",
  themePreference: "silverfox:themePreference",
} as const;
