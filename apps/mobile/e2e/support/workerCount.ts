/**
 * Shared between playwright.config.ts (sets `workers`) and global-setup.ts
 * (mints exactly this many isolated anonymous Supabase users, one per
 * worker). Kept as one named constant rather than duplicated literals so
 * the two can never drift out of sync.
 *
 * Why 4, not "as many as CPU cores": each worker signs in once for the
 * whole run (not once per test — see global-setup.ts), so 4 workers means
 * 4 anonymous sign-ins total, comfortably under Supabase's 30/hour
 * anonymous-sign-in rate limit even across several reruns in the same
 * hour. Higher would still be safe on the rate limit alone, but this suite
 * also shares one local dev server (Metro) and one real Supabase project
 * with everything else happening on the machine — 4 was chosen as a
 * reasonable middle ground, not derived from a hard constraint. Adjust if
 * measurement shows headroom either way.
 */
export const WORKER_COUNT = 4;
