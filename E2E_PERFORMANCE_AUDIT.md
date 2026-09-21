# E2E Performance Audit

Date: 2026-09-21
Scope: why the Playwright suite is slow, and what to do about it — architecture, not just runtime.

## Headline numbers (measured, not estimated)

- **70 distinct scenarios × 2 device projects (`android-pixel-7`, `desktop-chromium`) = 140 test runs**, executed with `workers: 1` and `fullyParallel: false` — **strictly sequential, one test at a time, for the entire suite.**
- A full prior run (before this stage) completed in **15.8 minutes** for 132 runs (66 scenarios × 2). The most recent run, after `exercise-substitution.spec.ts` was added (70 scenarios × 2 = 140), got through 98 of 140 before the process died outright (exit code 4, no clean summary) — per-test times had degraded to **9–13s on `android-pixel-7`** (previously ~6–7s) and **13–31s on `desktop-chromium`**, with one test spiking to **1.1 minutes**. Whatever caused that specific degradation (machine load from concurrent work in this session is the leading suspect — nothing in the app changed that would explain a 2–4x per-test slowdown), the sequential, single-worker architecture is what makes a bad moment for any one test cost the entire suite minutes, not seconds.
- Of the 140 runs, only **6 failures**, and every one is explained below (2 are a genuine pre-existing flake unrelated to this work; 2 were bugs in this stage's own new test file, fixed during this audit; the run's remaining 2+ are downstream of the crash, not independent failures).

## 1. Slowest tests and slowest setup

**Setup is not the bottleneck — it was already fixed.** `e2e/support/fixtures.ts` shares one authenticated browser context and one page per *worker*, reused across every test in that worker via `page.goto("/")` between tests (not a fresh context/page per test, and not `page.reload()`, which was measured to leak navigation state). `global-setup.ts` signs in **once for the entire run** and writes that session to `.auth/state.json`, specifically to avoid Supabase's 30-anonymous-sign-ins-per-hour rate limit and to avoid leaving dozens of orphaned `auth.users` rows (no service-role access to delete them). This is good, deliberate design — the problem is what it enables (see §5): because there is only **one** shared user for the **entire run**, every test in every file, across both projects, is implicitly serialized against that user's data, and `workers: 1`/`fullyParallel: false` makes that explicit.

**The slowest individual tests are exactly the ones doing real multi-step UI work** — `edit-cycle.spec.ts`'s full create→configure→edit→reload→edit-again cycle (24s on desktop), `programme-crud.spec.ts`'s happy path (13–66s, one run spiked to 1.1m), `exercise-library.spec.ts`'s custom-exercise creation (up to 31s on desktop). These are legitimately doing several real screens' worth of work and are not wasteful *individually* — they're just paying the full sequential-queue cost of running after everything ahead of them, and desktop-chromium in particular is markedly slower per-test than android-pixel-7 in this suite (worth its own investigation later, but out of scope here since neither device project should need dropping — see §5 on why both still matter).

## 2. Repeated operations / duplicate coverage / unnecessary browser tests

This is the dominant finding. **43 of the 70 scenarios (61%) are input-validation permutations run through a full browser round-trip, most of them re-doing expensive setup (starting a workout, navigating to a form) once per permutation:**

| File | What it fuzzes | Scenario count | Setup repeated per case |
|---|---|---|---|
| `workout-logging.spec.ts` | `REPS_CASES` (10) + `RIR_CASES` (9) | 19 | Full `startTodaysWorkout()` (tab nav + Start + wait) each time |
| `workout-logging.spec.ts` | `NAN_PROPAGATION_CASES` (6), looped inside one test | 1 test, 6 internal round-trips | Same, plus a `discardIfActive` + reload + Back-Home click per iteration |
| `programme-crud.spec.ts` | `SECURITY_PAYLOADS` (12, full list) | 12 | Full `goto("/programs/new")` + create + a **fixed 1500–2000ms sleep** each time |
| `exercise-library.spec.ts` | `SECURITY_PAYLOADS` (6 of 12) | 6 | Full `goto("/exercises/new")` + create + a **fixed 1500ms sleep** each time |

That's **43 browser sessions** whose actual assertion, in every single case, is one of exactly two things:
1. **Is a plain string stored and read back unmodified?** (the `SECURITY_PAYLOADS` tests, 18 of the 43) — this is a **persistence/escaping** question. Supabase-js parameterizes every insert; whether `"'; DROP TABLE users; --"` survives intact has nothing to do with React, the UI, or a browser, and everything to do with whether the repository function passes the value straight through to a parameterized query. **A browser adds zero coverage here that a direct call to `createProgram()`/`createExercise()` against the real (test) Supabase project doesn't already give, and gives it without rendering a single pixel.**
2. **Does a client-side filter/range-check accept or reject this value?** (the `REPS_CASES`/`RIR_CASES`/`NAN_PROPAGATION_CASES`/age-boundary tests, 25 of the 43) — as of the Stage 2 core-workout audit, this is now literally a pure function (`filterAndClampDigits` in `SetRow.tsx`, and the inline age-range check in `profile.tsx`). **These 25 tests are the *only* coverage this logic has today** (confirmed: `SetRow.test.tsx` has no digit-filter test), but they're covering a pure function through the single most expensive path available — a real workout session, a real page, a real database round-trip — when a five-line Vitest test proves the identical thing in under a millisecond.

Several of these tests are also **testing stale assumptions**: `workout-logging.spec.ts`'s `RIR_CASES` loop's own `recordFinding` calls assert "No client-side validation exists for RIR" — that was true when the test was written, but Stage 2 fixed exactly this (RIR is now clamped 0–10 as typed). The test still passes today only because the loop's assertions were written permissively (`toBeEnabled()` regardless of outcome, with a `recordFinding` side-channel rather than a hard failure) — meaning this coverage has been quietly stale since Stage 2 without anyone noticing, which is itself an argument for moving this to a typed unit test that would have caught the drift immediately.

**`profile.spec.ts`'s age-boundary test** (4 cases: 13/120/12/121) has the same shape — it's proving a range check that lives entirely in `profile.tsx`'s `handleSave`, reachable and testable as a plain function/component test without a page at all.

## 3. Flaky tests

**`workout-logging.spec.ts`: "happy path" and "weight defaults to a sensible value"**, `android-pixel-7` only. Both fail on a Playwright pointer-event-interception timeout clicking "Increase weight" (the reps `<textarea>` overlaps the stepper's hit area at this viewport width). Confirmed via `git diff` during Stage 2 that neither test nor the weight-stepper component has changed since this flake was first observed — it is a **pre-existing, viewport-specific layout issue, not a regression from any recent stage**. Not fixed here (out of this audit's scope, which is test *architecture*, not app layout), but documented so it isn't mistaken for new instability introduced by this optimization pass.

**`exercise-substitution.spec.ts`: both non-trivial scenarios failed on first real run** (`shows suitable alternatives...` and `substituting during a workout...`, on *both* projects). Root cause investigated via failure screenshots: **not a product bug** — the substitute screen's own documented design (`EXERCISE_SUBSTITUTION_SPEC.md` §3) is that an empty equipment checklist means "I have no equipment," which correctly shows only the bodyweight alternative (Push-Up). The tests wrongly asserted that an *empty* checklist should behave as *unconstrained*. Fixed by correcting the tests' assertions to match the documented, intended behaviour (check equipment before asserting on equipment-gated results) — not by changing the product. This is exactly the kind of thing a fast test loop would have caught in seconds instead of a 15-minute suite run.

## 4. Authentication cost

Already effectively free. One sign-in for the whole run (§1). Not a target for optimization on its own — but it is the reason **naive parallelization is unsafe today**: every worker would share the exact same `auth.uid()` from `.auth/state.json`, so two workers running concurrently would race each other's writes/deletes against one Supabase user. This is the real reason `workers: 1` exists, and it's a correct reason for the *current* fixture design — not a reason parallelization is impossible (see §5).

## 5. Parallelisation

**Safe, if isolation is fixed at the source: one Supabase user per *worker*, not one for the whole run.** The rate-limit concern that justifies a single global sign-in (30/hour) is not violated by, say, 3–4 workers each signing in once — that's 3–4 sign-ins total per run, nowhere near the limit, and each worker's fixtures already reuse its one session across every test it runs (no per-test sign-in either way). The single-shared-user design conflates two different constraints — "don't sign in more than ~30 times an hour" and "don't let two workers race the same rows" — that have separate fixes: mint N sessions in global setup (one per worker) instead of one, and hand each worker its own.

Once each worker owns a distinct anonymous user, **every existing spec file is already safe to parallelize as-is** — every test's cleanup (`afterEach`) already scopes to `supabaseAsTestUser`, which is that test's own worker's user, and RLS guarantees one worker's queries can never see or touch another's rows regardless. Nothing about the *tests* needs to change for parallel-safety; only *how many isolated users exist* does.

## 6. Browser lifecycle / arbitrary waits

**10 fixed `waitForTimeout` calls**, 300–2000ms each, totalling ~12.3s of pure dead time *per traversal* (more, inside loops): `delete-workflows.spec.ts` (1), `edit-cycle.spec.ts` (1), `exercise-library.spec.ts` (2), `navigation.spec.ts` (1), `profile.spec.ts` (2), `programme-crud.spec.ts` (2), `workout-logging.spec.ts` (1, inside a 6-iteration loop). Every one exists to "give an async save time to finish" before querying Supabase directly — exactly the case Playwright's own polling assertions (`expect.poll()`) or a direct retry loop against the database handle correctly and *faster*, since they proceed the instant the condition is true instead of always waiting the fixed worst-case duration.

No unnecessary full-page reloads were found beyond what's already documented and fixed: the suite already deliberately avoids `page.goto()` for in-app navigation in most places specifically because of the reload cost (see comments in `workout-logging.spec.ts`, `profile.spec.ts`, `edit-cycle.spec.ts`, `delete-workflows.spec.ts`) — though `exercise-library.spec.ts` and `programme-crud.spec.ts` still use `readyPage.goto(...)` directly for every test rather than tab-navigation, which is a smaller, secondary cost now that the webServer runs in production/minified mode (~0.5–1s per reload, not the ~28–30s the dev-mode bundle cost before that fix).

## 7. Coverage gap found in passing (not a performance finding, but adjacent)

The suite has **zero coverage of the real authentication journeys** built in Stage 1 (sign up, sign in, sign out, demo entry, logged-out first launch, or "signed-out data is invisible") — `session-bootstrap.spec.ts`'s own file-level comment calls the anonymous-session bootstrap "the closest thing this app has to an auth journey," which was accurate when written but is now stale: real auth exists and is untested end-to-end. This matters here because it's the inverse of the main finding — the suite is heavy on validation permutations that belong at a lower layer, and light on exactly the cross-cutting acceptance journeys Playwright exists for. Addressed in the target architecture below.

## Target test architecture

| Layer | What moves here | Runs without a browser? |
|---|---|---|
| **Domain** (`packages/domain`, Vitest) | Progression, validation-adjacent pure functions, exercise substitution matching/ranking, calculations, business rules | Yes — already the case for everything except the reps/RIR/age filters, which never got a unit test of their own |
| **Component/unit** (`apps/mobile`, Vitest + Testing Library) | `SetRow`'s digit-filtering (reps/RIR), `profile.tsx`'s age-range check — the exact logic the 25 fuzz-loop E2E tests exercise today | Yes |
| **Integration/API** (new: direct Supabase calls, no Playwright) | The 18 `SECURITY_PAYLOADS` persistence-safety tests, name-length-truncation tests — call the repository function, assert via a direct query | Yes |
| **Playwright acceptance** | The journeys that actually require a real browser: happy-path flows, cross-field/refresh persistence, the Alert.alert web-platform gap, the Stepper rapid-tap race, and (new) the core auth journeys | No — by design, this is the one layer that should use one |

## Recommended removals / migrations

- **Remove** the 19 `REPS_CASES`/`RIR_CASES` Playwright tests and the 6-case `NAN_PROPAGATION_CASES` loop from `workout-logging.spec.ts`. **Add** direct unit tests for `filterAndClampDigits` (already exported implicitly via `SetRow.tsx`'s behavior — made independently testable) covering the same boundary values in milliseconds instead of ~3 minutes of browser time.
- **Remove** `profile.spec.ts`'s age-boundary loop (4 cases) and the non-numeric-age test. **Add** a unit test for the age-range check, keep the one true acceptance test (fill in the whole profile, save, reload, confirm persistence).
- **Remove** the 18 `SECURITY_PAYLOADS` Playwright tests (12 in `programme-crud.spec.ts`, 6 in `exercise-library.spec.ts`). **Add** one integration test file that calls `createProgram`/`createExercise` directly for all 12 payloads each (making the exercise-library coverage more thorough than today's arbitrary slice of 6, at a fraction of the cost) and confirms round-trip fidelity via a direct Supabase read.
- **Keep every genuine acceptance journey as Playwright**: happy-path programme/exercise/profile creation, the edit-cycle cross-field test, the Stepper rapid-tap race, refresh/back-navigation persistence, the Alert.alert web-platform gap, double-tap-doesn't-duplicate, and all four new exercise-substitution journeys.
- **Add** the missing authentication acceptance journeys (§7): logged-out first launch, enter Demo, create account, sign in, sign out, and a check that signed-out browsing shows none of the previous session's data. This is filling a real gap in existing, already-shipped functionality, not new product work.
- **Fix**: replace all 10 `waitForTimeout` calls with `expect.poll()` against the actual condition being waited on.
- **Fix**: `playwright.config.ts`'s own top comment still points at a `supabaseTestClient.ts` file that doesn't exist (the isolation logic actually lives in `fixtures.ts`) — corrected in passing.

## Results (measured after implementation)

| | Before | After |
|---|---|---|
| Playwright scenarios (per project) | 70 | 32 |
| Playwright test runs (× 2 projects) | 140 | 64 |
| Playwright total runtime | 15.8 min (last clean baseline); the run immediately before this work degraded further and crashed outright before finishing | **2m 7s** |
| `workers` / `fullyParallel` | 1 / false | 4 / true, with one isolated Supabase user per worker |
| Fixed `waitForTimeout` calls | 10 | 0 |
| New: domain/unit tests added | — | 23 (`filterAndClampDigits` × 18, `isAgeInRange` × 5) |
| New: integration suite (no browser) | — | 24 tests, 5.6s, replacing 18 Playwright tests |
| Test failures after the change | — | 2 — both the pre-existing `android-pixel-7` weight-stepper flake (§3), confirmed unrelated to this work |

Full CI-equivalent (domain + mobile unit + integration + Playwright): **~2s + ~36s + ~6s + ~2m7s ≈ 2m50s**, down from ~16+ minutes.

## Targets (set after measuring, not before)

- **Domain suite**: already ~2s for 124 tests; adding the ~15 new unit tests above should stay well under 5s.
- **Integration/API suite**: 12 payloads × 2 entities, each a single network round-trip with no browser — should land under 15s total, replacing ~4–5 minutes of Playwright time.
- **Playwright acceptance suite**: dropping 43 tests and adding ~6 new auth-journey tests brings the per-project count from 70 to ~33; parallelized across workers with proper per-worker user isolation (§5), targeting **under 5 minutes** total for both projects combined, down from a 15.8-minute baseline (and the crashed run's far worse showing).
- **Full CI suite** (domain + integration + Playwright): **under 6 minutes**, down from ~16+ minutes.
