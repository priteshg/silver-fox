# PrimeForm — Authentication Foundation Implementation Report

Covers `CORE_IMPLEMENTATION_PLAN.md` Stages 1–4, delivered across two reviewed rounds. **Round 1** (Stages 1–2, below): real sign-up/sign-in/sign-out, the two-layer state model, and the fractional-weight fix. **Round 2** (new section further down): Stage 3's realistic local Demo content and Stage 4's "Use this programme"/"Start fresh" transition, plus a fresh, re-verified check of the live Supabase environment per this round's explicit instruction not to assume the earlier check still holds. Per the stop condition, work paused here for review both times — Stage 5 onward (validation hardening, exercise metadata) has not been started.

---

## Mandatory pre-work: verifying the existing Supabase environment

Before touching the anonymous sign-in path, the live, linked Supabase project was inspected directly (via `supabase inspect db table-stats --linked`, which connects to the real remote database) rather than assumed to be empty:

| Table | Rows found |
|---|---|
| `profiles` (≈ `auth.users`) | **94** |
| `workouts` | 1 |
| `workout_sets` | 1 |
| `programs` | 16 (14 built-in + 2 leftover custom test programmes) |
| `exercises` | 32 (all built-in — 0 custom) |
| `body_measurements` / `progress_photos` / `conditioning_sessions` / `mobility_sessions` | 0 each |

**Finding**: 94 anonymous identities exist, but they carry almost no data — one workout and one set in total, across all of them. This is consistent with automated E2E test runs accumulated across this engagement, not real user activity. **No meaningful existing user data was found.** Per the instruction, this finding is documented here and the change proceeded — no migration or preservation mechanism was built, and no destructive action was taken (no rows were deleted).

---

## What changed

### 1. Fractional weight fix (`PROGRESSION_LOGIC_AUDIT.md`, Risk 1)
- `components/SetRow.tsx`: the weight stepper's step size changed from 1kg to 0.5kg, with a `roundToHalfKg` guard against floating-point drift. This lets the control represent every value `loadProgression.ts`'s `suggestNextLoad` can produce (which rounds to the nearest half kilogram, e.g. 82.5kg) — previously, applying a suggestion could hand the stepper a value it could never reach on its own.
- No database change — `weight numeric` already supported fractional values.
- **Direction of the fix**: widened the input to match progression's precision, not the other way round (rounding suggestions down to whole numbers), per explicit product decision this round.

### 2. Real authentication (`lib/supabase/auth.ts`)
Added, alongside the existing `ensureSession`/`signInAnonymously` (kept, not deleted, since existing repository code and E2E test infrastructure still use them):
- `signUpWithEmail(email, password)`
- `signInWithEmail(email, password)`
- `signOut()`
- `restoreExistingSession()` — checks for an already-persisted session (real *or* legacy anonymous) without ever creating a new one; used at launch in place of the old automatic `ensureSession()` call.

### 3. Explicit client-state model (`providers/AuthProvider.tsx` — new)
Two independent layers, kept deliberately separate:
- **Supabase Authentication State** — `no_session` | `authenticated`, derived from `supabase.auth.getSession()` and kept current via `onAuthStateChange` (handles expiry: a session disappearing out from under the app — e.g. a failed token refresh — returns the person to logged-out, never to demo).
- **Client View Mode** — `logged_out` | `demo` | `app`, a purely local presentation choice. `demo` never results in any Supabase call.

### 4. Pre-authentication UI (`components/AuthFlow.tsx` — new)
Welcome screen (what PrimeForm does + See a demo / Create account / Sign in), sign-up form, sign-in form, and a minimal Demo screen (static example content, clearly labelled, zero network calls) — kept deliberately small per the "keep the Demo experience itself minimal if necessary" allowance. Every form shows a specific, visible error on failure (no silent failures) and a loading state during submission.

### 5. App gate (`app/_layout.tsx`)
`SessionGate` (which unconditionally called `ensureSession()`, silently creating an anonymous account on every launch) replaced by `AppGate`, which renders `AuthFlow` unless a real Supabase session already exists. No other route or screen in the app was touched.

### 6. Sign-out UI (`app/profile.tsx`)
A gap caught during manual verification, not anticipated in the original plan: `signOut()` existed in the provider but had no way to be triggered from within the real app. Added a "Sign Out" button to the existing Profile screen (the smallest, most natural home for it) with its own error handling.

### 7. E2E test infrastructure (`apps/mobile/e2e/global-setup.ts`)
The existing 66-test Playwright suite's shared-session bootstrap relied on the app itself auto-creating an anonymous session on page load — removed by this change. Fixed by having the setup script sign in anonymously directly via `supabase-js` in Node (bypassing the UI entirely, exactly as `ensureSession()` used to do), then injecting the resulting session into Playwright's storage state. This is test infrastructure only; no application code was changed to accommodate it.

---

## Database changes

**None.** No migration was needed or written. RLS policies are unchanged and untouched.

## Auth behaviour

- Fresh install / no session → Logged Out (confirmed live: no automatic account creation).
- "See a demo" → static example content, clearly labelled "DEMO — example data, not saved"; confirmed via live network inspection that **zero requests to Supabase occur** while in this mode.
- Sign-up → real Supabase account creation. **Discovered during implementation**: the live project requires email confirmation before granting a session — a fresh sign-up does not immediately authenticate. This is correctly surfaced as a visible error ("Couldn't complete that" / the real Supabase message), not a silent failure. Confirmed live.
- Sign-in with wrong credentials → visible, specific error ("Invalid login credentials") with retry. Confirmed live.
- Sign-in with valid/existing credentials → real, owned data. (Not exercised end-to-end live, due to the email-confirmation constraint above — see "Requires a product decision," below.)
- Session restoration → confirmed live: injecting a valid session (including a legacy anonymous one) and reloading correctly restores the full authenticated app, unchanged.
- Sign-out → confirmed live: returns to Logged Out, and **the session is genuinely cleared**, not just hidden (a subsequent reload does not re-authenticate).
- Session expiry → handled via `onAuthStateChange`; not exercised live (would require waiting out a real token expiry or revoking a session server-side), but the code path is the same one already proven correct for explicit sign-out.

## Client-state behaviour

Confirmed live: `logged_out` (welcome screen) → `demo` (static content, no network) → back → `logged_out`; separately, an existing session → `app` (full real UI, unchanged) → sign out → `logged_out`, surviving a reload.

## Tests added

- `components/__tests__/SetRow.test.tsx`: updated all click-count math for the new 0.5kg step; added four new tests specifically requested — whole-number progression via steps, a fractional value (82.5kg) displayed exactly, adjusting from a fractional starting value by one step, and recording a fractional weight exactly on completion.
- `apps/mobile/e2e/journeys/workout-logging.spec.ts`: updated the two existing weight-stepper tests for the new step size (renamed one for accuracy: "fixed half-kilogram steps," not "1kg steps").

## Tests passed / failed

| Suite | Result |
|---|---|
| `packages/domain` unit tests | 102/102 passed |
| `packages/validation` unit tests | 10/10 passed |
| `apps/mobile` component/unit tests (16 files, incl. the updated `SetRow.test.tsx`) | 74/74 passed |
| `apps/web` unit tests | 2/2 passed |
| Existing Playwright E2E suite (66 tests, after fixing global-setup and the two weight-step tests) | 66/66 passed |
| `turbo run lint` (whole monorepo) | 0 errors (fixed 3 pre-existing false-positive errors and 1 unused-var warning in E2E test files, unrelated to Stage 1, discovered while getting a clean baseline) |
| `turbo run typecheck` (whole monorepo) | 0 errors |
| `turbo run build` (whole monorepo) | succeeds |

No test was skipped, weakened, or deleted to make this pass.

## Issues discovered

1. **The live Supabase project requires email confirmation before granting a session on sign-up.** Confirmed by direct testing against the real project (not assumed). This means the sign-up flow as built correctly reaches a real, visible "check your email" / provider-error state, but cannot complete an automated end-to-end "sign up → land in the app" flow without either a real inbox or a confirmed test account.
2. **The Supabase project also rate-limits outbound confirmation emails** — encountered directly during both API-level testing and live UI verification ("email rate limit exceeded"). This is a project-level constraint, not a bug in this implementation, and further compounds (1) for automated testing purposes.
3. A cheap, one-line interaction bug in the new sign-up form's error path was implicitly exercised and handled correctly (no crash, a clear message) rather than causing a silent failure — recorded as a positive finding, not an issue.
4. The sign-out control was missing from the original implementation plan's file list and only surfaced during manual verification — now fixed (see "What changed," §6). Recorded here as a process note: manual verification caught something the plan itself missed.

## Requiring a product decision

1. **Email confirmation policy for this milestone.** Three options, none silently chosen: (a) leave confirmation required — real sign-up works, but cannot be end-to-end automated without a confirmed test account or a mailbox-reading step in CI; (b) disable email confirmation for this pre-launch project (a live Supabase Auth setting) so sign-up grants a session immediately — this is an **account/security setting change on a live external system**, which this session will not make without explicit instruction; (c) provide one pre-confirmed test credential for automated-testing purposes only, leaving the live policy untouched. No option was chosen unilaterally.
2. **The two leftover custom test programmes** found during the data-verification pass (2 of the 16 `programs` rows) were left untouched — they're pre-existing test artifacts, not something this change should silently clean up. Confirm whether they're safe to delete, or leave as-is.
3. Everything already flagged as unresolved in `FOUNDATION_DECISIONS.md` (password reset timing, the two leftover custom programmes above) remains unresolved and unaffected by this stage's work.

---

## Documentation status

| Document | Status |
|---|---|
| `PRODUCT_FOUNDATION.md`, `AUTH_AND_STATE_MODEL.md`, `CORE_IMPLEMENTATION_PLAN.md`, `FOUNDATION_DECISIONS.md`, `PROGRESSION_LOGIC_AUDIT.md` | Updated in the prior review pass to reflect the *planned* model; the weight-fix direction correction (§1 above) has been applied to `PROGRESSION_LOGIC_AUDIT.md` and `CORE_IMPLEMENTATION_PLAN.md` to match what was actually built. |
| `apps/mobile/e2e/features/starting_primeform.feature` | **Rewritten** to describe the implemented model (first visit, account creation, sign-in, return-while-signed-in, sign-out, expiry, connection failure) — the previous "session established automatically" content is gone, since that behaviour no longer exists. |
| `apps/mobile/e2e/features/demo_experience.feature` | **New.** Covers entering and leaving the demo. Deliberately does **not** include "Use this programme"/"Start fresh" scenarios — neither is implemented yet (both remain Stage 3/4 work), and writing a scenario for unimplemented behaviour would violate this project's established BDD discipline. |
| `apps/mobile/e2e/features/data_privacy.feature` | Unchanged in wording (it was already correct, technology-agnostic language) — its automation notes are updated in `BDD_SPECIFICATION.md` to reflect that two real accounts, not two anonymous sessions, are now the natural way to prove it. |
| `BDD_SPECIFICATION.md` | Updated per-feature notes for the three files above, with explicit IMPLEMENTED/NOT IMPLEMENTED marking. |

---

# Round 2 — Stages 3 & 4: Demo content, and the account-creation transition

## Mandatory pre-work, re-verified (not assumed from Round 1)

Round 1's "no meaningful existing data" finding was checked again directly against the live database rather than trusted from memory, per this round's explicit instruction. Full detail and the exact queries run are in `AUTH_AND_STATE_MODEL.md`'s new "Existing anonymous users — re-verified 2026-09-21" section. Summary: anonymous users have grown from 94 to **117** (fully explained by this engagement's own E2E/manual test activity since Round 1), still only **1 real (non-anonymous) account** — itself a test artifact with zero data — **1 workout/1 set total** (a dated manual-test row from before this round), **zero custom programmes**, **zero profiles with any display name set**. Conclusion unchanged: no meaningful real user data exists; no destructive action was taken; nothing was deleted.

## What changed

### 1. Local Demo content (`lib/demo/demoData.ts` — new)
Everything Round 1's minimal Demo screen lacked, built from data that already existed as plain local TypeScript — the Foundation 40+ catalogue (`data/programmeCatalogue.ts`) and the exercise library (`data/seedExercises.ts`) — joined together with **no network call of any kind**:
- The real Foundation 40+ programme structure (3 days, each with its real exercise list).
- 6 fabricated completed workouts spanning ~2.5 weeks, rotating Push/Pull/Legs.
- Bench Press's fabricated sets are specifically shaped so the real `suggestNextLoad` engine (unchanged, imported as-is) produces a genuine "increase" suggestion — Demo's Progress section shows an authentic computed result, not a hand-written second copy of one.
- A filled-in example profile (name, age, experience, goals, days/week, equipment).

`components/AuthFlow.tsx`'s `DemoScreen` was rewritten to render all of this — programme, recent workouts, a progress section with the live suggestion, and profile — under the pre-existing persistent "DEMO — example data, not saved" banner (unchanged).

### 2. "Use this programme" / "Start fresh" (`providers/AuthProvider.tsx`, `lib/repositories/programRepository.ts`, `components/AuthFlow.tsx`)
- **New state**: `pendingProgramChoice` on `AuthProvider`. Without this, a demo-originated signup that succeeds immediately would flip `viewMode` straight to `"app"` and the real app would render before the person ever saw the choice — `AppGate` (`app/_layout.tsx`) now also checks `pendingProgramChoice` to keep `AuthFlow` mounted for exactly one more screen.
- **New repository function**: `cloneBuiltInProgram(builtInProgramId)` — reads the built-in programme's detail and re-inserts its days and exercise targets under the new owner via the exact same row-shape mappers (`programToRow`/`dayToRow`/`programExerciseToRow`) ordinary custom-programme creation already uses. References the same shared `exercises` rows rather than copying them. Then the clone is set as the account's active programme.
- **"Start fresh" is a genuine no-op** — a brand-new account with no explicit active programme already reaches today's existing empty state by default; no new code path was needed for it beyond simply not calling the clone.
- Neither path ever touches `workouts`, `workout_sets`, or the profile.

### 3. Progression weight fractional-consistency — verified already complete, tests extended
Checked directly (not assumed): the 0.5kg stepper, `numeric` weight storage, unrounded display, and `suggestNextLoad`'s half-kilogram rounding are all still consistent with each other (unchanged since Round 1). Added the two domain-level cases the current round asked for explicitly: a whole-number progression result and a fractional (82.5kg) one, in `packages/domain/src/__tests__/loadProgression.test.ts`. The other two requested cases (recording and displaying a fractional weight) were already covered by Round 1's `SetRow.test.tsx` additions.

## Tests added

- `lib/demo/__tests__/demoData.test.ts` (7 tests): the demo dataset is a realistic, non-empty programme; has 4-6 fabricated workouts; spans 2-3 weeks; every fabricated set references a real exercise actually on its workout's day; the profile is genuinely filled in; Bench Press's history produces a real "increase" suggestion; the module is deterministic.
- `lib/repositories/__tests__/cloneBuiltInProgram.test.ts` (4 tests): cloning creates a new owned programme with the same days/targets; the original built-in programme is left untouched; the clone references (not copies) the shared exercise row; the clone gets fresh ids throughout.
- `packages/domain/src/__tests__/loadProgression.test.ts`: 2 new cases (whole-number and 82.5kg fractional progression), described above.
- `apps/mobile/e2e/features/demo_experience.feature`: 2 new scenarios — "Choosing to use the demo programme" and "Starting fresh instead."

## Tests passed / failed

| Suite | Result |
|---|---|
| `packages/domain` unit tests | 126/126 passed |
| `apps/mobile` component/unit tests | 108/108 passed in isolation; one pre-existing test (`SetRow.test.tsx`'s weight-clamp test, unrelated to this round's changes) intermittently times out at the default 5s only when run inside a fully-parallel `turbo run` alongside every other package's build — confirmed passing standalone twice. Not fixed here (out of this round's scope); flagged as a discovered, pre-existing environment-sensitivity issue. |
| `turbo run typecheck` (whole monorepo) | 0 errors (one error introduced and fixed during this round's own work — a test-only type mismatch assigning typed repository rows into the fake DB's `Record<string, unknown>` shape, needed an explicit cast) |
| `turbo run lint` (whole monorepo) | 0 errors |
| `turbo run build` (whole monorepo) | succeeds |
| Playwright E2E suite | see the dedicated Playwright report delivered alongside this document |

## Issues discovered

1. The pre-existing `SetRow.test.tsx` timing flake under full parallel `turbo` load, described above — not a regression from this round's work (confirmed via isolated re-runs), not fixed here.
2. A type-safety gap in the new `cloneBuiltInProgram` test surfaced (and was fixed) while getting a clean `typecheck` baseline — the fake-DB test helper's rows need an explicit widening cast when assigned directly rather than through its own `.insert()`; not a product-code issue.

## Requiring a product decision

1. **The demo-to-account choice is skipped when email confirmation is required.** If Supabase requires confirming the address before granting a session (the live project's current, unchanged setting — see Round 1), there is no session yet when signup returns, so "Use this programme"/"Start fresh" cannot run immediately; the person instead reaches an ordinary empty account after confirming and signing in separately, with no indication the choice was ever available. This is a real, current gap in the demo→account journey, not a hypothetical one. Two options, neither chosen unilaterally: (a) accept this as a known limitation of a pre-launch product and revisit if/when confirmation-required friction is addressed generally; (b) persist "came from demo, offer the choice" across the confirmation gap (e.g. a flag read back after the person eventually signs in) — a real feature addition, not attempted here since it wasn't asked for and adds meaningful scope.
2. Everything already flagged as unresolved in Round 1 (email confirmation policy, the two leftover custom test programmes — since deleted in a separate, later cleanup pass this engagement — and password reset timing) remains unresolved and unaffected by this round's work.

## Documentation status (this round)

| Document | Status |
|---|---|
| `CORE_IMPLEMENTATION_PLAN.md` | Stages 3 and 4 marked **DONE** with an implementation summary; each stage's original plan text is kept below its summary for reference, not deleted. |
| `AUTH_AND_STATE_MODEL.md` | New "Existing anonymous users — re-verified 2026-09-21" section added. |
| `apps/mobile/e2e/features/demo_experience.feature` | Two new scenarios added for "Use this programme" / "Start fresh" (see above). `starting_primeform.feature` and `data_privacy.feature` were checked and already correctly describe the current model — no changes needed. |
| `IMPLEMENTATION_REPORT.md` (this file) | This "Round 2" section added; Round 1's content kept as-is above it. |

## IMPLEMENTED (cumulative, Stages 1–4)
Real sign-up, sign-in, sign-out; session persistence and restoration; session-expiry handling; the two-layer state model; logged-out and authenticated UI; a realistic, fully local Demo (real programme structure, 6 fabricated workouts over ~2.5 weeks, a genuine computed progress suggestion, a filled-in profile) that never touches Supabase; "Use this programme" (clones the demo programme's structure into a new owned programme) and "Start fresh" (the existing empty-account default); the fractional-weight fix and its full requested test coverage (whole-number progression, fractional/82.5kg progression, recording a fractional weight, displaying one); a fresh, re-verified check of the live Supabase environment.

## NOT IMPLEMENTED
Password reset; OAuth; magic links; the demo-choice screen when email confirmation is required (falls back to an ordinary empty account instead — see "Requiring a product decision" above); Stage 5's reps/RIR-specific validation-hardening language and rep-range-rejection-with-message behaviour (note: reps/RIR digit-filtering, structural rep-range-order prevention, and save-error surfacing across programme/exercise/workout write paths were already built in an earlier, separately-scoped phase of this engagement — Stage 5 as originally worded in the plan is substantially, but not formally, satisfied; not re-verified or re-marked as part of this round since it wasn't in scope for it); exercise substitution metadata; any of Stage 6's exercise-metadata work.

## DEFERRED
Everything in "NOT IMPLEMENTED" above remains deferred to its originally-planned stage (or a future one) in `CORE_IMPLEMENTATION_PLAN.md` — nothing was skipped without a plan to return to it, and nothing beyond Stage 4 was started this round.
