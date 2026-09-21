# Data Model

The domain entities live in `packages/domain/src/entities`, and the
corresponding tables live in `supabase/migrations`. Every entity has `id`
plus `createdAt`/`updatedAt` (via the shared `Timestamped` type in
`packages/types`); every table has `created_at`/`updated_at`, kept current
by a `set_updated_at()` trigger.

## Entities

- **`User`** — a Supabase Auth identity (anonymous today, real credentials
  later) plus a `profiles` row: optional `displayName`/`email` (anonymous
  sessions have neither), `preferredWeightUnit`, and the profile fields a
  future recommendation engine will read — `trainingExperience`
  (`ProgrammeDifficulty`, so a user's experience and a programme's
  difficulty are literally the same scale), `goals` (`ProgrammeGoal[]`),
  `preferredTrainingDaysPerWeek`, `availableEquipment` (`Equipment[]`).
- **`Program`** — a training programme: `ownerId` (undefined for the
  built-in catalogue), `name`, `description`, `category`
  (full_body/upper_lower/push_pull_legs/hybrid), `targetAudience`,
  `difficulty`, `daysPerWeek`, `estimatedSessionMinutesLow/High`,
  `primaryGoal`/`secondaryGoals`, `philosophy`, `progressionMethod`,
  `deloadStrategy`, `isCustom` (only custom programmes are deletable).
- **`WorkoutDay`** (table: `program_sessions`) — one session within a
  `Program` (e.g. "Push Day"). `programId`, `name`, `order`, `focus`
  (push/pull/legs/upper/lower/full_body/other).
- **`Exercise`** — a library exercise, with full coaching content: `name`,
  `primaryMuscleGroup`/`secondaryMuscleGroups`, `equipment`, `repUnit`
  (reps or seconds, for holds/carries), `difficulty`, `movementPattern`,
  `description`/`why`/`setup`/`execution`/`breathingCue`, `formCues[]`,
  `commonMistakes[]`, `progressionGuidance`, `regressionOrSubstitution`,
  `substitutionExerciseIds[]` (backed by the `exercise_substitutions` table),
  `recommendedRestSeconds`, `media` (see MediaAsset below), `isCustom`,
  `ownerId` (undefined for the built-in library).
- **`ProgramExercise`** — an `Exercise`'s prescribed placement inside a
  `WorkoutDay`: `order`, `targetSets`, `targetRepRangeLow/High`,
  `targetRir`, `restSeconds`, `tempo` (eccentric-pause-concentric-pause,
  e.g. `"3-1-1-0"` — a CHECK constraint enforces the format), `warmupSets`,
  `notes`.
- **`Workout`** — an actual, logged (or in-progress) training session.
  `userId`, optional `programId` and `workoutDayId` (column: `session_id`)
  if it followed a programme day, `startedAt`, optional `completedAt`.
  `workoutDayId` is kept even if that day is later renamed or deleted —
  historical workouts never change once saved.
- **`WorkoutSet`** — one logged set within a `Workout`. `exerciseId`,
  `order`, `weight`, `weightUnit`, `reps`, optional `rir`. Only *completed*
  sets are ever persisted here — see "Active workout sessions" below.
- **MediaAsset** (table only — no TypeScript type yet, since nothing
  constructs one) — the normalized home for a demonstration image/video,
  referenced by `exercises.media_asset_id`, so a future AI-generation
  pipeline can add or replace an asset without touching the exercise row:
  `type`, `url`, `thumbnailUrl`, `durationSeconds`, `metadata` (jsonb),
  `source`, `status`. Every current exercise has no asset yet (`media` is
  `undefined`), so this is purely load-bearing schema until the first real
  asset exists.
- **Recipes foundation** (tables only — `recipes`, `ingredients`,
  `recipe_ingredients`, `recipe_categories`, `recipe_sources` — no
  TypeScript type, repository, or UI yet): nutrition per serving
  (`calories`, `proteinGrams`, `carbsGrams`, `fatGrams`), `servingSize`,
  `prepTimeMinutes`/`cookingTimeMinutes`, `instructions[]`, `dietaryTags[]`,
  `cuisine`, a `mediaAssetId`, and per-ingredient macros stored per 100g so
  any serving size can be derived. Deliberately schema-only until an actual
  recipe feature is built — see [development.md](./development.md) on why
  this repo avoids code with no consumer yet.
- **`ConditioningSession`** / **`MobilitySession`** / **`BodyMeasurement`**
  / **`ProgressPhoto`** — simple, strictly user-owned logs; unchanged in
  shape from before the database migration.

## Relationships

```
auth.users 1---1 profiles (User)
User 1---* Program 1---* WorkoutDay 1---* ProgramExercise *---1 Exercise
Exercise *---* Exercise (via exercise_substitutions: "use X instead of Y")
Exercise *---1 MediaAsset (optional)
User 1---* Workout 1---* WorkoutSet *---1 Exercise
User 1---* ConditioningSession / MobilitySession / BodyMeasurement / ProgressPhoto
Recipe *---* Ingredient (via recipe_ingredients); Recipe *---1 MediaAsset (optional)
```

- A `Program` belongs to one `User` (or none, for the built-in catalogue)
  and contains many `WorkoutDay`s.
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
persisted entity, and deliberately not in Postgres (see
[architecture.md](./architecture.md#inside-appsmobile)). It holds
`SessionExercise`s, each with `SessionSet`s that carry optional
`weight`/`reps`/`rir` and a `completed` flag, since a set exists (as an
empty slot) before it has values. `createSession`, `completeSet`, `addSet`,
`removeSet`, `updateExerciseTarget`, and `finishSession` (in
`session/session.ts`) are the pure functions that transform it;
`finishSession` converts only the _completed_ sets into a real `Workout` +
`WorkoutSet[]`, which is what actually gets persisted to history.

## Ids and primitives (`packages/types`)

Entity ids are branded strings (e.g. `UserId`, `WorkoutId`) via `Id<Brand>`
in `packages/types/src/ids.ts`, so passing a `RecipeId` where a `UserId` is
expected is a type error, even though both are strings at runtime. **They
are also the actual database primary keys** — every table's `id` column is
`text`, generated app-side by `createId()` (a timestamp + random suffix,
not a UUID), not a database default. This preserves every existing
hardcoded id (`program_ppl`, `ex_barbell_squat`, ...) across the migration
to Postgres unchanged. The one exception is anything tied to Supabase Auth
(`profiles.id`, every table's `owner_id`/`user_id`), which is a real `uuid`
because that's what `auth.users.id` is.

## Validation

Two layers, deliberately not merged into one:

- **`packages/validation`** — Zod schemas (`packages/validation/src/schemas/entities.ts`)
  validate untrusted data (form input, data read back from storage) at the
  boundary before it's treated as a trusted domain object. They intentionally
  mirror the domain types by hand rather than generating one from the other
  — see [development.md](./development.md) if that trade-off needs
  revisiting.
- **Postgres CHECK/FK constraints** (`supabase/migrations`) — the last line
  of defence against invalid data reaching the database at all, covering
  exactly what the app's own testing checklist calls out: rep ranges can't
  invert, sets must be positive, RIR must be sensible (0-10), tempo must
  match the `N-N-N-N` convention, a `program_exercises`/`workout_sets` row
  can't reference an exercise that doesn't exist, a custom programme/exercise
  must declare an owner. Exercised by `supabase/tests/database/*.sql`
  (pgTAP, run via `supabase test db`).

Row<->domain mapping for Postgres is a third, narrower kind of "validation"
in effect: `apps/mobile/lib/repositories/*Mappers.ts` are pure functions
(no Supabase import) doing the camelCase-TS <-> snake_case-SQL conversion,
unit tested by round-tripping a fully-populated object through both
directions (`lib/repositories/__tests__/supabaseMapping.test.ts`).

## Row Level Security

Every table is RLS-enabled. Reference data (`exercises` where `owner_id is
null`, `programs`/`program_sessions`/`program_exercises` where `not
is_custom`, `media_assets`, the recipe reference tables) is readable by
`anon`/`authenticated`. Anything a user creates or logs is scoped to
`owner_id = auth.uid()` or `user_id = auth.uid()`. See
[architecture.md](./architecture.md#database-supabase) for why this is safe
with a public anon key.

## Extending the model

- Keep new fields optional unless every existing and future record can
  supply them.
- A new relationship should usually be a foreign id field (e.g. `programId`
  on `Workout`), not a nested object — entities stay flat and normalized.
- Add the domain type first, then its Zod schema, then a migration under
  `supabase/migrations`. If the entity has seed content (like exercises or
  programmes), add it to `data/seedExercises.ts` /
  `data/programmeCatalogue.ts` and regenerate `supabase/seed.sql` — see
  `apps/mobile/scripts/generateSeedSql.ts`. Don't hand-edit `seed.sql`.
- Don't add a domain type, Zod schema, or repository for an entity with no
  real consumer yet (see MediaAsset and the recipe tables above) — a
  migration alone is enough of a "foundation" until a feature actually
  reads or writes it.
