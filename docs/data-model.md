# Data Model

The initial domain entities live in `packages/domain/src/entities`. They are
intentionally minimal — enough shape to build the first vertical slices of
each feature area, not a complete schema. Every entity has `id` plus
`createdAt`/`updatedAt` (via the shared `Timestamped` type).

## Entities

- **`User`** — `displayName`, `email`, `preferredWeightUnit` (`kg` | `lb`).
- **`Program`** — a training program owned by a user. `ownerId`, `name`,
  optional `description`.
- **`WorkoutDay`** — one day within a `Program` (e.g. "Push Day").
  `programId`, `name`, `order`.
- **`Exercise`** — a library exercise. `name`, `primaryMuscleGroup`,
  `secondaryMuscleGroups`, `equipment`, `description`, `instructions`
  (ordered steps), optional `imageUrl`/`videoUrl` (demonstration
  placeholders), `isCustom` (false for the built-in library).
- **`ProgramExercise`** — an `Exercise`'s prescribed placement inside a
  `WorkoutDay`: `order`, `targetSets`, `targetRepRangeLow/High`, optional
  `targetRir`, optional `restSeconds`.
- **`Workout`** — an actual, logged (or in-progress) training session.
  `userId`, optional `programId` and `workoutDayId` if it followed a
  programme day, `startedAt`, optional `completedAt`. `workoutDayId` is kept
  even if that day is later renamed or deleted — historical workouts never
  change once saved.
- **`WorkoutSet`** — one logged set within a `Workout`. `exerciseId`,
  `order`, `weight`, `weightUnit`, `reps`, optional `rir`.
- **`NutritionProfile`** — a user's nutrition targets. `dailyCalorieTarget`,
  `dailyProteinTargetGrams`.
- **`Recipe`** — a discoverable recipe. `name`, `proteinGrams`, `calories`,
  optional `imageUrl`.

## Relationships

```
User 1---* Program 1---* WorkoutDay 1---* ProgramExercise *---1 Exercise
User 1---* Workout 1---* WorkoutSet *---1 Exercise
User 1---1 NutritionProfile
Recipe (standalone; no relations yet)
```

- A `Program` belongs to one `User` and contains many `WorkoutDay`s.
- A `WorkoutDay` contains many `ProgramExercise`s, each referencing one
  `Exercise`.
- A `Workout` belongs to one `User`, optionally follows one `Program`, and
  contains many `WorkoutSet`s, each referencing one `Exercise`.
- A `WorkoutSet` does not reference a `ProgramExercise` — logged sets are
  independent of the plan so a user can log freely, deviate from a plan, or
  work out without one at all. Reconciling planned vs. actual is a future
  feature concern, not a data-model constraint.

## Active workout sessions (`packages/domain/src/session`)

A `WorkoutSession` is runtime-only state for a workout in progress — not a
persisted entity. It holds `SessionExercise`s, each with `SessionSet`s that
carry optional `weight`/`reps`/`rir` and a `completed` flag, since a set
exists (as an empty slot) before it has values. `createSession`,
`completeSet`, `addSet`, `removeSet`, `updateExerciseTarget`, and
`finishSession` (in `session/session.ts`) are the pure functions that
transform it; `finishSession` converts only the _completed_ sets into a real
`Workout` + `WorkoutSet[]`, which is what actually gets persisted to
history. This keeps "what the user is mid-way through logging" cleanly
separate from "what happened," per
[architecture.md](./architecture.md#workout-session-state).

## Ids and primitives (`packages/types`)

Entity ids are branded strings (e.g. `UserId`, `WorkoutId`) via `Id<Brand>`
in `packages/types/src/ids.ts`, so passing a `RecipeId` where a `UserId` is
expected is a type error, even though both are strings at runtime. Shared
primitives (`ISODateString`, `WeightUnit`, `Timestamped`) also live there.

## Validation (`packages/validation`)

Each entity has a corresponding Zod schema in
`packages/validation/src/schemas/entities.ts`, used to validate untrusted
data (form input, API payloads) at the boundary before it's treated as a
trusted domain object. The schemas intentionally mirror the domain types by
hand rather than generating one from the other — see
[development.md](./development.md) if that trade-off needs revisiting.

## Extending the model

- Keep new fields optional unless every existing and future record can
  supply them.
- A new relationship should usually be a foreign id field (e.g. `programId`
  on `Workout`), not a nested object — entities stay flat and normalized.
- Add the domain type first, then its Zod schema, then a migration under
  `supabase/migrations` once the entity is actually persisted.
