# Exercise Substitution — Audit

Date: 2026-09-20
Scope: understand exactly what exists today before designing Stage 3. Nothing below is assumed from the earlier `PROGRESSION_LOGIC_AUDIT.md` or `CORE_WORKOUT_AUDIT.md` — every claim here was re-verified by reading the current code.

## 1. Exercise schema (current)

[`packages/domain/src/entities/exercise.ts`](packages/domain/src/entities/exercise.ts), mirrored by [`supabase/migrations/20260918213631_exercises.sql`](supabase/migrations/20260918213631_exercises.sql):

| Field | Type | Notes |
|---|---|---|
| `primaryMuscleGroup` | enum (9 values: chest, back, shoulders, biceps, triceps, legs, glutes, core, full_body) | DB CHECK-constrained |
| `secondaryMuscleGroups` | enum[] | same enum, DB array, not CHECK-constrained per-element (see §9) |
| `equipment` | enum (8 values: barbell, dumbbell, machine, cable, bodyweight, kettlebell, band, other) | DB CHECK-constrained. **Single value, not a set** — an exercise needs exactly one primary equipment type today |
| `difficulty` | enum (beginner/intermediate/advanced) or undefined | optional, DB CHECK-constrained when present |
| `movementPattern` | **free text**, max 80 chars | optional, no DB constraint at all — see §2 |
| `regressionOrSubstitution` | free text, max 500 chars | optional prose, e.g. "A goblet squat or hack squat machine give you..." — read-only coaching copy |
| `substitutionExerciseIds` | `ExerciseId[]`, resolved from a join table | see §3 — **already exists, already wired into read/write, never surfaced in any UI** |
| compound/isolation | **does not exist** | not a field anywhere |
| unilateral/bilateral | **does not exist** | not a field anywhere |
| exercise category | **does not exist** as a distinct concept — closest is `primaryMuscleGroup` + free-text `movementPattern` | |

## 2. `movementPattern` — verified current state

It is a raw `string`, unconstrained in the DB (`movement_pattern text` — no CHECK), unconstrained in the Zod schema (`z.string().max(80).optional()`), and absent entirely from the custom-exercise creation form (`apps/mobile/app/(tabs)/exercises/new.tsx` has no field for it — every custom exercise has `movementPattern: undefined`).

Grepping the 32 built-in seed exercises (`apps/mobile/data/seedExercises.ts`) for every distinct value actually in use today:

```
Knee-Dominant Squat (×3)   Horizontal Push (×3)      Vertical Pull (×2)
Horizontal Pull (×3)       Vertical Push (×2)        Shoulder Isolation
Elbow Flexion (×2)         Elbow Extension (×2)      Rear Delt / Upper Back
Hip Hinge (×3)             Hamstring Isolation       Knee Isolation
Ankle Extension            Core Stability            Unilateral Squat
Horizontal Isolation       Loaded Carry              Anti-Rotation
Spinal Flexion
```

This confirms the field is currently a **dumping ground for at least three unrelated concerns** mixed inconsistently per exercise:
- true movement pattern (`Horizontal Push`, `Hip Hinge`, `Vertical Pull`)
- joint action / muscle target (`Elbow Flexion`, `Elbow Extension`, `Ankle Extension`, `Knee Isolation`, `Hamstring Isolation`)
- compound-vs-isolation-ish labels bolted onto the pattern name (`Shoulder Isolation`, `Horizontal Isolation`) or onto laterality (`Unilateral Squat`)

Free text with this level of inconsistency **cannot be matched reliably** — `"Horizontal Push"` and `"Horizontal Isolation"` are not comparable as movement patterns, and `"Unilateral Squat"` conflates a pattern with a property that should be its own field. This must become a constrained value (§ design decision in the spec) plus separate compound/isolation and unilateral/bilateral fields.

## 3. `exercise_substitutions` table — verified current state

The table already exists (`supabase/migrations/20260918213631_exercises.sql`):

```sql
create table public.exercise_substitutions (
  exercise_id text not null references public.exercises (id) on delete cascade,
  substitute_exercise_id text not null references public.exercises (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (exercise_id, substitute_exercise_id),
  constraint exercise_substitutions_no_self_reference check (exercise_id <> substitute_exercise_id)
);
```

It is directional (A→B does not imply B→A), carries an optional `reason`, and has **only a select policy** — no insert/update/delete RLS policy exists for regular users, meaning it can currently only be populated by seed data or a service role, never by a user through the app.

It is fully wired on the read side: [`exerciseRepository.ts`](apps/mobile/lib/repositories/exerciseRepository.ts)'s `loadExercises()` joins it and hydrates `Exercise.substitutionExerciseIds`; `createExercise()` writes rows into it when a new custom exercise is saved with `substitutionExerciseIds` set. **But nothing in the UI ever sets `substitutionExerciseIds` on creation** (the new-exercise form has no such field), and **nothing in the UI ever reads it** — confirmed by grep: `substitutionExerciseIds` only appears in the repository/mapper/domain layers, never in a screen. The only substitution-adjacent thing a user can currently see is the read-only prose in `regressionOrSubstitution`, shown once on the exercise detail screen.

10 of the 32 built-in exercises have `substitutionExerciseIds` populated in seed data (e.g. Bench Press → [Machine Chest Press, Dumbbell Bench Press]); the relationships are asymmetric and not reciprocated (Dumbbell Bench Press has no substitutes of its own, despite being a listed substitute for Bench Press).

**Conclusion: the table is well-designed for its stated purpose and needs no schema change. It has simply never been connected to a UI or a matching algorithm.** This is the "curated relationships" half of a hybrid approach, already built.

## 4. Exercise library content gaps

Checked every exercise the user's own examples reference against the current 32-exercise seed library:

| Example chain | Exists today? |
|---|---|
| Bench Press | ✅ `ex_bench_press` |
| Dumbbell Bench Press | ✅ `ex_dumbbell_bench_press` |
| Chest Press Machine | ✅ `ex_machine_chest_press` |
| Push-ups | ❌ **missing** |
| Leg Press | ✅ `ex_leg_press` |
| Hack Squat | ❌ **missing** |
| Goblet Squat | ✅ `ex_goblet_squat` |
| Bulgarian Split Squat | ❌ **missing** |
| Cable Row | ✅ `ex_seated_cable_row` (named "Seated Cable Row") |
| Chest-Supported Dumbbell Row | ✅ `ex_chest_supported_row` (already dumbbell equipment) |
| Barbell Row | ❌ **missing** |
| One-Arm Dumbbell Row | ❌ **missing** |

Four exercises named directly in the brief don't exist yet. A useful demonstration of the new substitution model requires adding them — a small, targeted addition (4 exercises), not the "large exercise-library expansion" Stage 2 explicitly ruled out.

## 5. Custom exercises — participation in substitution

Confirmed via `apps/mobile/app/(tabs)/exercises/new.tsx`: a custom exercise can only ever be given `name`, `primaryMuscleGroup`, `secondaryMuscleGroups`, `equipment`, `description`, `instructions`. It **never** gets `movementPattern`, `difficulty`, or `substitutionExerciseIds` through the current UI — those fields exist on the type but are simply never populated for a user-authored exercise. Any substitution-matching logic that requires `movementPattern` will silently exclude every custom exercise today, which is a real, current gap — not a hypothetical one — and needs an explicit product decision (see spec §7).

## 6. Where a substitution would actually plug into the workout flow

Traced the full session lifecycle in [`packages/domain/src/session/`](packages/domain/src/session/):

- `SessionExercise` (the in-memory, per-workout slice of a `WorkoutSession`) carries its own `exerciseId`, separate from the programme's `ProgramExercise.exerciseId`. It also carries `programExerciseId`, a pointer back to the originating programme slot.
- `finishSession()` builds each persisted `WorkoutSet.exerciseId` directly from `exercise.exerciseId` on the `SessionExercise` — **not** from the programme.
- `updateExerciseTarget()` is an existing precedent for exactly this shape of mutation: a pure function that takes a session, a `sessionExerciseId`, and a partial update, and returns a new session — wired through `ActiveSessionProvider` with an identical `setSession(current => ...)` + `persist()` pattern for every other mutator (`addSet`, `completeSet`, etc.).

**This means the "programme stays intact, workout reflects what was actually done" requirement is already structurally satisfied by the existing data model with zero schema changes to `workouts`/`workout_sets`/`programs`.** Changing `SessionExercise.exerciseId` mid-workout, the same way `updateExerciseTarget` already changes targets mid-workout, automatically:
- leaves `ProgramExercise` (the plan) completely untouched
- causes `finishSession()` to persist the substituted `exerciseId` into `workout_sets`, so history/progress naturally show what was actually performed
- keeps `programExerciseId` on the session exercise pointing at the original programme slot, so "this slot corresponds to programme exercise X" is preserved for lookups even after substitution

Confirmed via grep across `apps/mobile/app/workout/`, `lib/startWorkout.ts`, `providers/ActiveSessionProvider.tsx`, and `packages/domain/src/session/session.ts`: **there is currently zero substitution-related code anywhere in the workout flow.** This is new build territory, not a fix to existing broken logic.

## 7. Equipment availability — verified current state

`User.availableEquipment?: Equipment[]` already exists ([`packages/domain/src/entities/user.ts`](packages/domain/src/entities/user.ts)), is settable today from the Profile screen (a chip multi-select over the same 8-value `Equipment` enum), and is persisted to `public.profiles`. Confirmed via grep across the entire mobile app: **it is currently written and stored but read by nothing** — no filtering, no recommendation, no substitution logic consumes it anywhere today. This is exactly the "smallest useful representation of available equipment" the brief asks for, already built and simply unused. It should be reused as the default/pre-fill for a substitution request, not replaced with a new mechanism.

## 8. Validation layer

[`packages/validation/src/schemas/entities.ts`](packages/validation/src/schemas/entities.ts)'s `exerciseSchema` mirrors the domain type exactly: `movementPattern: z.string().max(80).optional()` (unconstrained), `substitutionExerciseIds: z.array(z.string().min(1)).optional()`. No compound/isolation/laterality fields exist here either, consistent with §1.

## 9. Summary of what genuinely needs to change

- `movementPattern`: go from unconstrained free text to a small constrained domain value (see spec).
- Add two new structured fields: compound/isolation, unilateral/bilateral — neither exists today in any form, free-text or otherwise.
- `exercise_substitutions`: keep as-is structurally; it's correctly designed. No migration needed for this table itself.
- `User.availableEquipment`: keep and reuse as-is; no change needed to this field.
- Add ~4 missing exercises so the brief's own worked examples are real, using the newly constrained metadata.
- Everything else (RLS, the read/write plumbing for `exercise_substitutions`, the session/workout separation) is already correctly built and needs no structural change — only new logic that uses it.
