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

There is no backend yet, so this app also owns local persistence. Layers,
top to bottom:

```
app/                    Expo Router screens — thin: render + call hooks
providers/               ActiveSessionProvider — the one piece of truly
                         global state (a workout in progress), because it
                         must survive navigating away and back
hooks/                   Per-screen data hooks (usePrograms, useExerciseLibrary,
                         useProgramDetail, useWorkoutHistory, useRestTimer):
                         load from a repository, expose CRUD + refresh
lib/repositories/        AsyncStorage-backed CRUD for each collection
                         (programs+days+programExercises, exercises,
                         workouts+sets); validates on read via
                         @silver-fox/validation, seeds from data/ on first run
lib/storage/             Thin AsyncStorage JSON get/set/remove wrapper
data/                    Seed exercise library + a starter programme
components/              App-specific UI (SetRow, RestTimerBar, Stepper, ...)
                         built from packages/ui + packages/config, not
                         promoted to packages/ui since nothing outside this
                         app uses them yet
```

Screens don't call repositories directly; they go through a hook, so a
screen never needs to know whether data lives in AsyncStorage, SQLite, or a
future Supabase client. The active workout session is the one exception to
"reload on focus": it's global Context, persisted to storage on every
change, so it survives leaving the screen, backgrounding the app, or a full
reload — see `providers/ActiveSessionProvider.tsx`.

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

Today (no backend yet): a screen collects input → a repository in
`apps/mobile/lib/repositories` constructs/updates a plain domain object from
`packages/domain` and persists it to AsyncStorage, validating anything read
back via a Zod schema from `packages/validation` → a hook re-renders the
screen from the updated data. Business rules (e.g. how volume or estimated
1RM is calculated) live in `packages/domain`, never duplicated in a screen
or component.

Once Supabase is introduced, only the repository layer changes (AsyncStorage
calls become Supabase calls); domain objects, validation, and screens should
not need to change.

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
