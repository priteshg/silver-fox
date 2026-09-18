# Silver Fox

Silver Fox is a premium fitness and nutrition application: fast workout
logging (weights, reps, sets, RIR), an exercise library, workout history and
progression tracking, and nutrition/protein tracking with high-protein
recipe discovery.

The mobile app (`apps/mobile`) currently implements the full
programme → workout → logging → history loop, working entirely offline on
device storage: build a training programme, browse or extend the built-in
exercise library, start a workout from a saved programme, log sets with a
persistent in-progress session, and review progression per exercise. It
ships with a seeded "Push Pull Legs" programme and a 14-exercise library so
it's usable immediately. Authentication, nutrition, AI features, and a
backend are not built yet — see [docs/development.md](docs/development.md).
The web app (`apps/web`) is still the design-system showcase from the
initial foundation.

See [docs/product.md](docs/product.md) for the product vision,
[docs/architecture.md](docs/architecture.md) for how the codebase is put
together, [docs/design-system.md](docs/design-system.md) for the visual
system, [docs/data-model.md](docs/data-model.md) for the domain entities,
and [docs/development.md](docs/development.md) for the rules that govern
day-to-day changes (read this one before making changes).

## Repository structure

```
apps/
  mobile/       Expo Router app (iOS, Android)
  web/          Next.js App Router app
packages/
  domain/       Framework-free domain models and business logic
  types/        Shared generic TypeScript types
  validation/   Zod schemas for validating data at boundaries
  ui/           Design-system components (per-platform where needed)
  config/       Design tokens (color, spacing, typography, motion, ...)
supabase/       Supabase project config, migrations, edge functions
docs/           Product, architecture, and process documentation
```

## Requirements

- Node.js ≥ 20.9
- pnpm ≥ 9 (this repo was set up with pnpm 12.4.2)

## Install dependencies

```bash
pnpm install
```

## Run the mobile app

```bash
pnpm dev:mobile
```

This starts the Expo dev server. Press `i` for iOS Simulator, `a` for
Android Emulator, or `w` to preview in a browser via Expo's own web target
(a separate thing from `apps/web`).

## Run the web app

```bash
pnpm dev:web
```

Opens the Next.js app at http://localhost:3000.

## Run tests

```bash
pnpm test
```

Runs Vitest across all packages/apps that define a `test` script. To also
run the web app's Playwright end-to-end smoke test:

```bash
pnpm --filter @silver-fox/web test:e2e
```

## Run linting

```bash
pnpm lint
```

## Type-check

```bash
pnpm typecheck
```

## Build

```bash
pnpm build
```

Builds every package and app via Turborepo, in dependency order. To build a
single app: `pnpm --filter @silver-fox/web build` (or `@silver-fox/mobile`;
note Expo apps are normally shipped via `eas build`, not a local web-style
build — see [Expo's build docs](https://docs.expo.dev/build/introduction/)
when that's needed).
