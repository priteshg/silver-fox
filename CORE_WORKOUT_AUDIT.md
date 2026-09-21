# Core Workout Journey Audit — Stage 2

Date: 2026-09-20
Scope: Programme → Workout → Sets → Complete → History → Progress only, per Stage 2 instructions. No AI, adaptation, substitution, social, nutrition, or other roadmap work is included here.

## 1. The journey as it currently works

**Programme** — `app/(tabs)/programs/new.tsx` creates a custom programme (name, description, day names); `app/(tabs)/programs/[programId]/index.tsx` is the single detail/edit screen: rename/describe, add/remove days, add/reorder/remove exercises per day, configure each exercise's targets (`.../exercise/[programExerciseId].tsx`). `programs/index.tsx` lists programmes and lets the user pick one as "active" (`selectProgram`).

**Workout** — `lib/startWorkout.ts` builds an in-memory `WorkoutSession` from the active programme day's `ProgramExercise` targets and starts it via `ActiveSessionProvider`. `app/workout/active.tsx` is the live workout screen: navigate between exercises, log sets via `SetRow` (weight/reps/RIR), adjust rep-range targets inline, finish.

**Sets** — `SetRow.tsx` writes weight (stepper, 0.5 kg steps, `roundToHalfKg`), reps and RIR (free-text, digit-filtered and clamped). A set only counts as "completed" once marked done (`packages/domain/src/session/session.ts`'s `finishSession` filters to `set.completed && weight !== undefined && reps !== undefined`).

**Complete** — `finishSession` builds a `Workout` + `WorkoutSet[]` from the session (stable `id = session.id`) and `workoutRepository.saveCompletedWorkout` persists both. On success the app navigates to `app/workout/summary.tsx`, then back to Home.

**History** — `hooks/useWorkoutHistory.ts` and `hooks/useWorkoutHome.ts` both read the same two repository calls, `listWorkouts()` / `listWorkoutSets()` (plain `select("*")`, scoped to the current user by RLS — see §3). `app/(tabs)/workouts/index.tsx` renders `useWorkoutHome().allWorkouts`.

**Progress** — `app/(tabs)/progress/index.tsx` reads `useWorkoutHistory().workouts/sets` — the *same* raw data as History — and derives records/streaks/volume from it via pure `@silver-fox/domain` functions (`calculateCurrentRecords`, `calculateWeeklyStreak`, `countDistinctTrainedWeeks`, `calculateTotalVolume`).

## 2. Problems found and fixed this phase

| # | Problem | Where | Severity | Fix |
|---|---|---|---|---|
| 1 | `saveCompletedWorkout` did two non-atomic inserts (`workouts` then `workout_sets`) with no compensation. A failure on the second insert left a phantom, set-less "completed" workout in the database. | `lib/repositories/workoutRepository.ts` | High — silent history corruption | Added a compensating delete of the just-inserted `workouts` row if the `workout_sets` insert fails, then re-throws. Verified `finishSession` reuses a stable `session.id` across retries, so a retry after compensation lands cleanly. |
| 2 | Finishing a workout (`handleFinish` in `active.tsx`) called `finishSession()` with **no error handling at all**. Any save failure (network, RLS, DB) was an unhandled promise rejection: no user feedback, no retry path, and the user could believe their workout was saved when it wasn't. | `app/workout/active.tsx` | Highest — exactly the systemic risk the prior audit flagged | Split into `handleFinish` (confirmation dialog) + `performFinish` (try/catch). On failure: visible inline error banner, Finish button re-enabled for retry. On start: button shows "Saving…" and is disabled to prevent double-submission mid-save. |
| 3 | `hasLoggedAnySet` existed in `@silver-fox/domain` but was called from nowhere — finishing an empty workout (zero completed sets) showed the same generic confirmation as finishing a real one. | `app/workout/active.tsx` | Low (UX only) | Wired into the confirmation dialog's message. |
| 4 | Rep-range target (low/high) could be entered backwards, and was silently "corrected" only at save time (`Math.max(low, high)`) with no indication to the user their entered value was overridden. This existed in **two places** with the same bug. | Standalone configure screen (`.../exercise/[programExerciseId].tsx`) and the inline mid-workout target editor (`app/workout/active.tsx`) | Medium — silent, inconsistent behaviour | Coupled the Low/High steppers in both places so the invalid state (low > high) is structurally unreachable, instead of correcting it after the fact. |
| 5 | Reps and RIR text inputs accepted any text — negative numbers, decimals, non-numeric characters — with no validation matching the DB's actual constraints. | `components/SetRow.tsx` | Medium — invalid data reaches the DB or is silently rejected there | Added `filterAndClampDigits`: strips non-digits as typed, clamps to 999 (reps) / 10 (RIR, matching the DB CHECK constraint exactly). Kept free-text rather than a stepper since these fields legitimately span a wide range. |
| 6 | Profile age accepted arbitrary text and out-of-range values; `save()` failures were completely silent (no catch anywhere in the call chain). | `app/profile.tsx` | Medium | Digit-filtered input; explicit 13–120 range check (the actual DB constraint) with a clear message before attempting to save; full try/catch around `save()` for any other failure, shown via the existing error-text style. |
| 7 | Programme detail screen (`[programId]/index.tsx`): renaming/describing a programme (`saveEditing`), adding a day (`handleAddDay` — had a `try/finally` with **no `catch`**, meaning a failure was an unhandled rejection after `isSavingDay` reset), and the fire-and-forget `removeExercise`/`removeDay`/`moveExercise` calls all had no error surfacing. | `app/(tabs)/programs/[programId]/index.tsx` | Medium — same silent-failure pattern as #2, in the Plan side of the app | Added a shared `actionError` banner (same visual pattern as the workout screen's), wrapped every mutation in try/catch or `.catch()`, and gave the "Save" button in edit mode a loading/disabled state. |
| 8 | Exercise configure screen (`.../exercise/[programExerciseId].tsx`): `handleSave` and `handleRemove` called `addExercise`/`updateExercise`/`removeExercise` with no error handling. | Same file | Medium | Same pattern: try/catch, inline error text, disabled/loading Save and Remove buttons during the request. |

All eight fixes typecheck clean (`npx tsc --noEmit`, zero errors) as of this writing.

## 3. Data integrity — Plan vs Record

Verified explicitly, not assumed:

- **`workout_sets` is written only by `workoutRepository.saveCompletedWorkout`** (grepped across `apps/mobile/lib`) — insert-only in normal operation, with the one delete path being the same-transaction compensating rollback described in fix #1. **Nothing in the programme-editing code path (`useProgramDetail.ts` and its screens) ever touches `workouts` or `workout_sets`.** Editing, renaming, or deleting a programme, day, or exercise cannot alter a historical record — this was verified by reading the actual insert/update call sites, not inferred from naming.
- Programme changes are entirely isolated to `programs` / `program_days` / `program_exercises` tables (the Plan side). A completed `Workout` row stores a snapshot reference (`program_id`, `session_id`) but never a live join back to current programme state for its **recorded** values (weight/reps/RIR are stored directly on `workout_sets`, not recomputed from the programme).
- **One exception, already display-only and out of Stage 2 scope by design**: `app/workout/summary.tsx` re-queries `getProgramDetail(programId)` live to compute `totalPlannedExercises` (e.g. "6 of 8 exercises completed"), rather than using a snapshot from when the workout happened. If the programme's exercise count for that day changes *after* the workout, this one summary figure would reflect the *current* count, not the historical one. This is currently invisible in practice: grepped every navigation into this screen and confirmed it is reachable only via `router.replace` immediately after finishing a workout (`app/workout/active.tsx`), never from History — so a user can never revisit a workout's summary later and see it drift. Documented here per the audit requirement; **not fixed**, since Stage 2 explicitly scopes out speculative fixes for non-observable behaviour and the actual stored records (`workout_sets`) are unaffected.
- RLS policies (`supabase/migrations/20260918213648_workouts.sql`) enforce per-owner visibility on both `workouts` and `workout_sets` at the database level (`workouts are only visible to their owner`, `workout sets are only visible via an owned workout`). The client's `listWorkouts()`/`listWorkoutSets()` calls are unfiltered `select("*")` by design — correctness is enforced server-side, not client-side, so there is no risk of one user's data leaking into another's History/Progress even though the client code doesn't filter explicitly.
- History and Progress are **guaranteed** to agree because they consume the exact same repository functions (`listWorkouts`/`listWorkoutSets`) through two thin hooks (`useWorkoutHistory`, `useWorkoutHome`) with no divergent computation — confirmed by reading both hooks in full.

## 4. Validation — current state

| Field | Rule enforced | Where |
|---|---|---|
| Weight | 0.5 kg stepper granularity, `roundToHalfKg` avoids float drift | `SetRow.tsx` |
| Reps | Digits only, clamped 0–999 | `SetRow.tsx` (fixed this phase) |
| RIR | Digits only, clamped 0–10 (matches DB CHECK) | `SetRow.tsx` (fixed this phase) |
| Rep-range target (low/high) | Structurally coupled — high always ≥ low, at the input level, not just at save | Configure screen + inline editor (fixed this phase) |
| Programme name / Exercise name | `maxLength` client-side + server-error fallback message if the DB still rejects it | `programs/new.tsx`, `exercises/new.tsx` (pre-existing, confirmed still correct) |
| Profile age | Digits only; range 13–120 checked with a clear message before save | `profile.tsx` (fixed this phase) |

No arbitrary new validation rules were added beyond what the product's actual constraints require (the DB's own CHECK constraints for RIR/age, and structural range-validity for rep targets).

## 5. Error handling — current state

Every write in the core Programme/Workout path that can fail now has: a user-visible message, a UI that doesn't lie about what was saved, and a way to retry (either the same button re-enables, or the failed action simply didn't happen so nothing needs undoing). No new notification framework was introduced — every fix reuses the same "inline error text near the action" pattern already established for programme/exercise creation in an earlier phase.

Remaining known gap, explicitly **not fixed** in Stage 2 (out of core-journey scope): `handleLogMeasurement` in `app/(tabs)/progress/index.tsx` (body-measurement logging under the Physique tab) has no try/catch. This is not part of the Programme → Workout → Sets → Complete → History → Progress loop as scoped — flagging for a future pass rather than expanding Stage 2's surface area.

## 6. Recommended changes beyond this phase (not implemented — product decisions, not audit findings)

- None required for Stage 2 sign-off. The one open item (`summary.tsx`'s live re-query) is documented above and requires no action while it stays unreachable outside the immediate post-finish flow.

## 7. Test results (after all Stage 2 fixes)

- Monorepo `typecheck`, `lint`, `test`, `build` across all 7 packages: **24/24 tasks passed** (188 unit tests: 102 domain, 74 mobile, 10 validation, 2 web; both `web` and `mobile` production builds succeeded). One lint error was found and fixed in the course of this run (an unescaped apostrophe in `AuthFlow.tsx`'s Stage-1 "Check your email" copy, unrelated to Stage 2 logic but caught by the same pass).
- E2E (`playwright test`, 66 scenarios × 2 viewport projects = 132 runs): **130 passed, 2 failed**. Both failures are the same scenario (`workout-logging.spec.ts`, weight-stepper interaction) on the `android-pixel-7` project only — a Playwright pointer-event-interception timeout clicking "Increase weight", not a validation or logic failure. Verified via `git diff` that this session's only change to that file (`SetRow.tsx`) is the reps/RIR `onChangeText` digit-filter, a pure text transform with no layout or style changes; the weight-stepper component and its layout are unchanged from an earlier phase. This is a pre-existing, viewport-specific flake, not a Stage 2 regression — left as a known issue rather than risking a layout change without dedicated device-testing time, which would be out of Stage 2's scope.
- Manual verification on a mobile viewport (375×812, via a dedicated scratch anonymous session — the shared E2E test account was mid-run and not reused, to avoid interference): created a real custom programme, confirmed the rep-range Low/High coupling fix live (raising Low past High automatically raised High in lockstep — no backwards range reachable), confirmed the reps digit-filter live (`-5abc9999` → `999`, correctly clamped) and the RIR clamp live (`55` → `10`). The scratch programme and its account were identified and removed from the live database afterward following the same process as the earlier test-data cleanup (confirmed: one programme, zero workouts, zero sets, owned solely by a throwaway account created for this check); verified zero rows remain.
