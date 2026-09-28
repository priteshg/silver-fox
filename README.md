# PrimeForm

PrimeForm is a premium fitness and nutrition application: fast workout
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
Set up Microsoft Playwright CLI as the primary browser automation tool for this project.

Use the official Microsoft Playwright CLI and its Claude Code skill.

First inspect the existing Playwright setup.

Do not replace working Playwright tests unnecessarily.

Install/configure the Playwright CLI skill so Claude Code can use browser automation directly.

Use Playwright CLI for:

• Browser exploration
• UI verification
• Mobile viewport testing
• Navigation testing
• Form validation
• Workout-flow testing
• Regression investigation
• Visual verification
• Debugging failing Playwright tests

Use Playwright Test for the permanent automated regression suite.

Do not confuse the two roles.

Playwright CLI should be the agent's interactive browser tool.

Playwright Test should contain repeatable automated tests that run in CI.

MOBILE TESTING

This is particularly important.

Silver Fox is primarily a mobile fitness application, so test mobile layouts rather than relying only on desktop browser testing.

Use Playwright's mobile/device emulation where appropriate.

Test at minimum:

• Android-sized viewport
• iPhone-sized viewport
• Small mobile viewport
• Larger mobile viewport

Pay particular attention to:

• Bottom navigation
• Android system navigation overlap
• Safe areas
• Keyboard behaviour
• Workout controls
• Weight increment/decrement controls
• Buttons near the bottom of the screen
• Scrolling
• Modals
• Forms
• Long exercise names
• Long programme names
• Small screens

BOTTOM NAVIGATION

Use Playwright CLI to inspect the current application.

Verify that the bottom navigation:

• Is completely visible
• Sits above the Android system navigation area
• Has sufficient touch area
• Does not overlap application content
• Does not disappear while scrolling unexpectedly
• Has a clearly visible active state
• Works on small screens

Take screenshots where useful.

WORKOUT FLOW

Use Playwright CLI to manually explore:

Home
→ Programmes
→ Select programme
→ Start workout
→ Open exercise
→ Log set
→ Change weight
→ Change reps
→ Enter RIR
→ Complete set
→ Finish workout
→ History

Identify any UI problems.

Do not immediately change code when something fails.

First determine whether the problem is:

• UI bug
• Data bug
• Supabase issue
• Navigation issue
• Validation issue
• Test issue

Then fix the underlying problem.

PERMANENT TESTS

After exploration, convert important stable journeys into Playwright Test tests.

Prioritise:

1. Application loads
2. Bottom navigation works
3. Programme selection works
4. Workout starts
5. Exercise information renders
6. Set logging works
7. Weight controls work
8. RIR input works
9. Workout completion works
10. Workout history renders
11. Data persists after reload
12. Invalid input is rejected
13. Mobile layout does not overlap system/navigation areas

DATABASE

Supabase is now the source of truth.

Tests should verify that the UI correctly consumes database-backed programme and workout data.

Do not create fake hard-coded programme data purely to make browser tests pass.

TEST DATA

Create a controlled test-data strategy.

Tests must not depend on whatever personal data happens to exist in the development database.

Where appropriate, use dedicated test users and predictable test records.

Avoid destructive tests against production data.

REPORTING

When testing, capture:

• Failed journey
• Exact screen
• Expected behaviour
• Actual behaviour
• Screenshot when useful
• Console errors
• Network/API errors where relevant
• Likely root cause

Do not produce huge amounts of unnecessary test output.

TOKEN EFFICIENCY

Use Playwright CLI snapshots rather than screenshots when visual inspection is unnecessary.

Use screenshots when evaluating:

• Layout
• Visual hierarchy
• Mobile positioning
• Navigation
• Overlapping elements

Keep browser sessions focused and close sessions when finished.

FINAL REQUIREMENT

Before adding the next major feature, use Playwright CLI to perform a complete mobile walkthrough of the current application.

The goal is to establish a reliable browser-testing workflow before we significantly expand the programme library, recipes and AI fitness media.

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
