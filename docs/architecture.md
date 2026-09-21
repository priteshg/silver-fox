# Architecture

Silver Fox is a pnpm + Turborepo monorepo. It exists to maximize code reuse
between the mobile app (Expo/React Native) and the web app (Next.js) while
keeping the parts that must be platform-specific cleanly separated.

## Repository structure

```
apps/
  mobile/       Expo Router app (iOS, Android, and Expo's own web preview)
  web/          Next.js App Router app
packages/
  domain/       Framework-free domain models and business logic
  types/        Shared, generic TypeScript types (ids, primitives)
  validation/   Zod schemas for validating data at boundaries
  ui/           Design-system components, implemented per platform
  config/       Design tokens (colors, spacing, typography, motion, ...)
supabase/       Supabase project config, migrations, and edge functions
docs/           Product, architecture, and process documentation
```

## Package responsibilities and dependency direction

Dependencies only ever point downward. Nothing in `packages/domain` or
`packages/types` may import from anything above it in this list:

```
apps/mobile, apps/web
        |
        v
packages/ui  --------> packages/config
        |
        v
packages/validation
        |
        v
packages/domain
        |
        v
packages/types
```

- **`packages/types`** — generic, structural TypeScript types with zero
  dependencies: branded id types, `ISODateString`, shared unions. If a type
  is genuinely generic (not a domain entity), it belongs here.
- **`packages/domain`** — the domain model: entities (`User`, `Program`,
  `Workout`, `WorkoutSet`, etc.) and pure business logic (e.g. estimating a
  one-rep max, summing set volume). **Must not depend on React, React
  Native, Next.js, or Supabase.** This is what makes the domain layer
  trivially unit-testable and reusable from any runtime, including a future
  server-side edge function.
- **`packages/validation`** — Zod schemas that validate data at boundaries
  (forms, API payloads) before it becomes a trusted domain object. Depends
  on `domain` and `types` so schema shapes stay aligned with entity shapes.
- **`packages/config`** — design tokens only: color, spacing, radius,
  typography, elevation, icon sizing, touch targets, animation timing. No
  React or platform dependency, so both apps read the same source of truth.
- **`packages/ui`** — the shared design system. Components that need
  different rendering per platform (e.g. `Button`) ship two files —
  `Button.tsx` for web/DOM and `Button.native.tsx` for React Native — behind
  one shared prop type in `types.ts`. Metro resolves the `.native.tsx`
  variant automatically for the mobile app; Next.js resolves the plain
  `.tsx` variant for web. This avoids a `react-native-web` dependency while
  still sharing prop contracts, tokens, and file organization.
- **`apps/mobile`** — Expo Router app. Owns navigation, screens, and
  platform wiring (permissions, native modules) as those features arrive.
  This is currently where the actual product (programme building, workout
  logging, progression) lives — see
  [Inside `apps/mobile`](#inside-appsmobile) below.
- **`apps/web`** — Next.js App Router app. Owns routing, server/client
  component boundaries, and web-specific concerns (SEO, SSR). Currently a
  design-system showcase; the workout feature has not been built for web
  yet (see [product.md](./product.md) — logging is mobile/offline-first by
  design).

## Inside `apps/mobile`

Postgres (via Supabase) is the source of truth for everything except two
deliberately device-local exceptions. Layers, top to bottom:

```
app/                    Expo Router screens — thin: render + call hooks.
                         app/_layout.tsx also hosts SessionGate, which blocks
                         rendering until the Supabase session bootstraps.
providers/               ActiveSessionProvider — the one piece of truly
                         global state (a workout in progress), because it
                         must survive navigating away and back
hooks/                   Per-screen data hooks (usePrograms, useExerciseLibrary,
                         useProgramDetail, useWorkoutHistory, useRestTimer):
                         load from a repository, expose CRUD + refresh
lib/repositories/        Supabase-backed CRUD for each collection (programs+
                         sessions+programExercises, exercises, workouts+sets,
                         conditioning, mobility, body measurements, progress
                         photos); *Mappers.ts files hold the pure row<->domain
                         conversion, kept free of any Supabase import so
                         plain scripts (the seed generator) and unit tests
                         can use them without a live or mocked connection
lib/supabase/            client.ts (the supabase-js singleton, reading
                         EXPO_PUBLIC_SUPABASE_URL/ANON_KEY) and auth.ts
                         (anonymous sign-in bootstrap + the current user id)
lib/storage/             Thin AsyncStorage JSON get/set/remove wrapper —
                         now used only for the two device-local exceptions
                         below, not for anything Postgres owns
data/                    Seed exercise library + programme catalogue —
                         still the one authored place for their *content*;
                         scripts/generateSeedSql.ts turns them into
                         supabase/seed.sql rather than seeding AsyncStorage
components/              App-specific UI (SetRow, RestTimerBar, Stepper, ...)
                         built from packages/ui + packages/config, not
                         promoted to packages/ui since nothing outside this
                         app uses them yet
```

Screens don't call repositories directly; they go through a hook, so a
screen never needs to know whether data lives in Postgres or AsyncStorage.
Two things are deliberately **not** in Postgres, because they're per-device
UI state rather than data: the active workout session (survives
backgrounding/reload via `providers/ActiveSessionProvider.tsx`, persisted to
AsyncStorage on every change) and the selected-programme preference. Both
would be meaningless to sync across devices and add nothing by living in the
database.

### Auth

There's no login screen yet, so every device gets a real Supabase Auth
identity via anonymous sign-in (`lib/supabase/auth.ts`), persisted across
restarts through the same AsyncStorage-backed session storage supabase-js
uses everywhere. `app/_layout.tsx`'s `SessionGate` blocks the whole app
behind that one bootstrap call so no repository ever races an unauthenticated
client. This is what gives Row Level Security a genuine `auth.uid()` to key
on; upgrading an anonymous session to real credentials later
(`supabase.auth.linkIdentity`) keeps the same user id and all of its data.

### Database (`supabase/`)

```
supabase/migrations/    Hand-written SQL migrations (schema + RLS policies),
                         applied in filename order via the Supabase CLI
supabase/seed.sql       Generated — do not hand-edit. Regenerate with
                         `pnpm --filter @silver-fox/mobile generate-seed`
                         after changing data/seedExercises.ts or
                         data/programmeCatalogue.ts, then re-apply with
                         `supabase db reset` (local) or `supabase db push`
                         + `psql "$SUPABASE_DB_URL" -f supabase/seed.sql` (remote)
supabase/tests/database/  pgTAP tests for constraints and RLS, run via
                         `supabase test db` (needs Docker for the local stack)
```

Every table a client can read is governed by a Row Level Security policy:
built-in reference data (the exercise library, the programme catalogue,
recipes once that lands) is world-readable; anything a user creates
(a custom programme, a custom exercise, workout history, body measurements)
is scoped to `owner_id`/`user_id = auth.uid()`. The anon key embedded in the
client is safe to ship — RLS, not secrecy of that key, is what protects the
data. See [data-model.md](./data-model.md) for the schema itself.

### Workout session state

`packages/domain/src/session` defines `WorkoutSession` and pure functions to
create/mutate it (`addSet`, `completeSet`, `finishSession`, ...). The
provider is a thin wrapper: it calls those pure functions and persists the
result. `finishSession` is what turns a session into real `Workout` +
`WorkoutSet[]` history records — only completed sets survive that
conversion. Business rules live in the pure functions (and are unit tested
there); the provider only adds React state and storage side effects.

## Why packages build to `dist/`

Each package under `packages/` compiles its TypeScript source to a `dist/`
folder via `tsc` (`pnpm build`, or `pnpm dev` to watch). Both apps consume
the compiled output like any other npm dependency, rather than the raw
`src/`. This keeps Metro (React Native's bundler) working correctly in a
pnpm workspace, since Metro does not transform `node_modules` — including
symlinked local workspace packages — the way Next.js's bundler can.
Turborepo's `build` task has `dependsOn: ["^build"]`, so a package's
dependencies are always built before it is.

## Data flow

A screen collects input → a repository in `apps/mobile/lib/repositories`
constructs/updates a plain domain object from `packages/domain`, maps it to
a Postgres row shape, and persists it via the `supabase-js` client → a hook
re-renders the screen from the updated data. Business rules (e.g. how volume
or estimated 1RM is calculated, or per-exercise load progression) live in
`packages/domain`, never duplicated in a screen, component, or the database
itself — Postgres enforces structural integrity (required fields, valid
ranges, valid references) via CHECK/FK constraints, but never business logic.

This was in fact the one and only layer that changed when Supabase replaced
AsyncStorage as the source of truth: domain objects, validation schemas, and
every screen were untouched, exactly as originally planned.

## Keeping this maintainable

- Don't add a new package unless a real cross-cutting need exists. Prefer
  putting code in the app that uses it until at least two consumers need it.
- Don't let `packages/domain` or `packages/types` import a framework. If a
  domain function seems to need React or Supabase, that logic belongs at a
  higher layer.
- Don't duplicate a component's logic between `Component.tsx` and
  `Component.native.tsx` beyond what platform rendering actually requires;
  share prop types and any pure logic.
- See [development.md](./development.md) for the day-to-day rules this
  architecture depends on.
