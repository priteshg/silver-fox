---
name: bdd-testing
description: >-
  Governs all work on this repo's Cucumber/Gherkin BDD suite —
  apps/mobile/e2e/features/*.feature, e2e/steps/*.steps.ts, e2e/pages/*.ts
  Page Objects, e2e/fixtures/bddFixtures.ts, hooks (Before/After), the
  playwright-bdd config in playwright.config.ts, bddgen, and the "bdd"
  Playwright project. Use this whenever writing or fixing a .feature file,
  implementing or repairing step definitions, touching BDD fixtures/hooks/
  world state, debugging "undefined step", "ambiguous step", "BDD config not
  found", or a flaky/failing BDD scenario, deciding test data or cleanup
  strategy for a scenario, or running the BDD suite. Trigger on phrases like
  "fix the undefined steps", "add a step definition", "write a scenario for
  X", "this step is flaky", "BDD test is failing", "run bddgen", even
  without the words "Cucumber" or "Gherkin".
---

# BDD Testing (playwright-bdd)

This skill exists to keep `apps/mobile`'s BDD suite complete, maintainable,
fast, deterministic, and aligned with real application behaviour. It
governs everything under `apps/mobile/e2e/features/`, `e2e/steps/`,
`e2e/pages/` (Page Objects), `e2e/fixtures/bddFixtures.ts`, and the
`playwright-bdd`/`bddgen` machinery in `playwright.config.ts`.

**A passing step definition does not mean the step is correctly
implemented.** Treat the whole chain as one connected system:

```
.feature scenario → Gherkin step → step definition → bddFixtures.ts state
  → Page Object (e2e/pages/) → real app screen → assertion
```

A fix that only makes the step text resolve to *some* function, without
that function actually exercising the behaviour the scenario describes, is
not a fix — it's a false positive, which is worse than an honestly
undefined step.

## Architecture in this repo (read before changing anything)

- **Feature files**: `apps/mobile/e2e/features/*.feature`. Some are still
  documentation-only (no step file wired up yet) — check
  `playwright.config.ts`'s `defineBddConfig({ features: [...] })` list to
  see which files are actually included in generation. A `.feature` file
  not in that array is inert no matter what step definitions exist for it.
- **Step files**: `apps/mobile/e2e/steps/*.steps.ts`, each calling
  `const { Given, When, Then, After } = createBdd(test)` with `test`
  imported from `../fixtures/bddFixtures`. `common.steps.ts` holds step text
  that is verbatim-identical across more than one `.feature` file (see
  "Duplicate step text" below).
- **Fixtures**: `apps/mobile/e2e/fixtures/bddFixtures.ts` — a `test` object
  rooted in `import { test as base } from 'playwright-bdd'` (not
  `@playwright/test`'s own base; `createBdd()` requires this lineage).
  Injects Page Objects, `supabaseAsTestUser`, `storageState` (reusing the
  same per-worker `e2e/.auth/state-N.json` files the hand-written suite
  uses — see `e2e/global-setup.ts`), and `scenarioState` (a plain mutable
  object for passing state between steps within one scenario).
- **Page Objects**: `apps/mobile/e2e/pages/*.ts`, extending `BasePage`
  (`e2e/pages/BasePage.ts`). Step definitions should stay thin and call
  into these, not embed selectors/locators directly (see §3).
- **Config**: `apps/mobile/playwright.config.ts`'s `defineBddConfig()` call
  — `features`, `steps` globs, `outputDir: "e2e/.features-gen"` (a git- and
  watcher-ignored generated directory — never hand-edit it), and `tags`.
  Generated specs run under a **dedicated `"bdd"` Playwright project**, not
  `desktop-chromium`/`mobile` — playwright-bdd's runtime resolves each
  generated test's config *by the project's `testDir`*, which must exactly
  equal `defineBddConfig()`'s return value. If you see `BDD config not
  found for testDir: "..."`, this is almost always why — check the failing
  project's `testDir` against the `bddTestDir` constant, not the step code.
- **Regenerating**: run `pnpm run bddgen` (or `pnpm run test:e2e:bdd`, which
  does `bddgen && playwright test --project=bdd`) after *any* change to a
  `.feature` file or a `.steps.ts` file. Stale generated specs under
  `e2e/.features-gen` are a common, confusing false trail — when in doubt,
  `rm -rf e2e/.features-gen && pnpm exec bddgen` for a clean slate.
- **This suite runs alongside, not instead of**, the hand-written
  `e2e/journeys/*.spec.ts` Playwright suite. Never let a BDD change break
  those tests, and reuse their conventions (RUN_TAG-based cleanup, the
  `supabaseAsTestUser` fixture pattern, `goToTab` nav helper) rather than
  inventing parallel ones.

## 1. Always inspect before changing

Before touching BDD code, read: the `.feature` file(s) involved, every step
file that could match the step text (grep across `e2e/steps/*.steps.ts` —
step text can be defined anywhere in that glob, not necessarily the
file whose name matches the feature), `bddFixtures.ts`, the relevant Page
Object(s), `playwright.config.ts`'s `defineBddConfig` block, `cucumber.json`
(VS Code extension config — keep its `glue`/`features` globs in sync with
`defineBddConfig`'s), and the actual application screen/component the
scenario exercises. Do not assume the first failing step is the whole
problem — run the full affected `.feature` file, not just one scenario.

## 2. Build a complete step inventory

For every step in a `.feature` file you're working on, determine: which
step file (if any) defines it, its Cucumber-expression/regex pattern, its
parameters, what Page Object methods it calls, what it asserts, and whether
it's actually reachable (not excluded by a tag filter — see §9). Before
declaring a step "fixed," grep for its exact text elsewhere in
`e2e/steps/*.steps.ts` — **defining the same step text twice is a hard
error** (`bddgen` fails with "Multiple definitions matched scenario step"),
and this repo has already hit it in two different shapes:

- **Given/Then are keyword-agnostic for matching.** Cucumber (and
  playwright-bdd) match step *text*, not the Given/When/Then keyword used
  to call it — registering the same pattern under both `Given(...)` and
  `Then(...)` is an ambiguous duplicate even though the calling scenarios
  use different keywords. When one scenario's outcome ("Then X") is
  identical text to another scenario's precondition ("Given X"), register
  it **once**, and make the single handler idempotent: check
  `scenarioState` for a flag set the first time it runs to decide whether
  it needs to build the precondition from scratch or just verify (see
  `programme_exercises.steps.ts`'s `ensureExerciseTarget` /
  `"{string} lists {string} before {string}"` for the working pattern).
- **Verbatim-identical step text across different `.feature` files** (e.g.
  "I leave the name blank" in both `programmes.feature` and
  `exercise_library.feature`) must be defined exactly once, in
  `common.steps.ts`, disambiguated via `scenarioState` (e.g.
  `scenarioState.nameFieldLabel`) set by each domain's own Given step —
  never paste a second copy into a domain-specific step file.

Also watch for: steps whose Gherkin literal text has **no quotes** around
what looks like a parameter (`Then today's workout uses Dumbbell Bench
Press`, not `Then today's workout uses "Dumbbell Bench Press"`) — a
`{string}` cucumber-expression will silently fail to match unquoted literal
text; either register the literal phrase directly or add quotes to the
`.feature` file if the value is genuinely meant to vary.

## 3. Separate behaviour from implementation

Gherkin describes user-observable behaviour; step definitions stay thin and
delegate to Page Objects (`e2e/pages/`) for locators and multi-step flows.
Never put a raw `page.getByRole(...)` chain inline in a step file for
anything beyond a one-off; add a method to the relevant Page Object
instead, extending `BasePage` (which owns `goto`, `goToTab`, and
`openFromHome` — every non-Home Page Object's `open()` must go through
`openFromHome(tabName)`, not call `goToTab` directly, since a fresh BDD
scenario's page starts at `about:blank` with no tab bar yet).

## 4. Playwright rules

Prefer locators + `expect(...).toBeVisible()`/auto-waiting, role-based and
accessible-label selectors (this app wires `accessibilityLabel`/
`accessibilityRole` throughout — reuse them, don't invent CSS selectors).
Never use `waitForTimeout` or a fixed sleep to paper over a race.

**This repo's specific async-race gotcha**: several in-app actions
(`selectProgram`, `updateInfo`/rename, `moveExercise`) fire an async
Supabase write from an `onPress` handler. Playwright's `.click()` only
waits for the event dispatch, not that in-flight `await` inside the
handler — clicking and immediately navigating away (e.g. a full
`page.goto("/")` reload) can race ahead of the write and read stale state.
Fix this by waiting for the **resulting UI state change** after the click
(a badge appearing, a button disappearing, changed text) before moving on
— see `ProgrammesPage.makeMyProgrammeFromDetail`/`renameTo`/`moveUp`'s
wrapped `expect(...).toPass({ timeout })` for the established pattern.
Don't just add a longer timeout; wait for the actual condition.

## 5. Assertions must prove behaviour

Never make a scenario pass by weakening or deleting its assertion,
swallowing an error, or silently using different numbers than the ones
written in the `.feature` file. If a scenario's own example values
contradict real app behaviour (e.g. a Gherkin scenario claiming a 1kg
stepper step when the real step is 0.5kg — see
`workout_sets.feature`'s "Adjusting weight in fixed steps"), that is a
**spec/implementation mismatch**, not a step-definition bug. Tag it
`@specmismatch` with a comment explaining the discrepancy and exclude it
via `tags` in `defineBddConfig` — do not "fix" it by quietly implementing
different numbers than what the scenario says, and do not force a
misleading pass.

Similarly, when a scenario's precondition is genuinely unreachable through
the app on the web platform — most commonly because the action is gated
behind `Alert.alert`, which is a documented no-op on `react-native-web`
(see `e2e/journeys/delete-workflows.spec.ts`'s existing "KNOWN GAP" tests)
— tag the scenario `@webgap` with a one-line comment naming which gap, and
exclude it the same way. `playwright.config.ts` currently excludes both via
`tags: "not @webgap and not @specmismatch"`. Extend that list with new tag
names rather than inventing ad-hoc exclusion mechanisms if a third category
of legitimate gap shows up.

## 6. Test state and isolation

Every worker reuses **one persistent anonymous Supabase user** across every
scenario it runs (`e2e/global-setup.ts` mints `WORKER_COUNT` sessions once;
`bddFixtures.ts`'s `storageState` fixture picks the right one per worker —
same mechanism the hand-written suite uses, to stay under Supabase's
anonymous-sign-in rate limit). This has real consequences:

- **State persists across scenarios within a worker.** A programme made
  "active" in one scenario can still be active when a later scenario in
  the same worker runs — don't assume a fresh account. Where a scenario's
  precondition is "X is/isn't already true," check current state first and
  make the action idempotent (see `programmes.steps.ts`'s `"I make
  {string} my programme"` checking `isActiveOnList` before clicking).
- **Clean up what you create, by literal name**, in an `After()` hook —
  see the `CREATED_PROGRAMME_NAMES`/`CREATED_EXERCISE_NAMES` pattern in
  `programmes.steps.ts`/`exercise_library.steps.ts`. Since scenarios reuse
  the same literal Gherkin example names (e.g. "Strength 3 Days" appears in
  both `programmes.feature` and `programme_exercises.feature`), delete by
  exact name/prefix every time, not just "delete everything," so repeated
  runs stay idempotent without one file's cleanup touching another's data.
- **Never seed data for a state a scenario reaches through normal UI
  flow.** Only seed directly via `supabaseAsTestUser` (or manipulate
  `localStorage`) for state that's impractical to reach through the UI
  itself — e.g. "recorded X last time" (a previous, separate completed
  workout — see `workout_sets.steps.ts`'s `seedPreviousPerformance`) or
  clearing an in-progress session to bypass the `Alert.alert` gap
  (`WorkoutPage.discardViaStorage`). Know the exact schema you're writing
  to (`workouts`/`workout_sets` column names, and that `workout_sets.order`
  is matched against the in-session `setNumber`, which is **1-based** —
  seeding `order: 0` silently produces no match at all, a real bug hit and
  fixed in this suite).
- **`supabaseAsTestUser` must be called lazily, not destructured and used
  immediately.** Playwright resolves every fixture a test destructures
  *before* the test body (i.e. before any Given/When/Then step runs) — but
  BDD navigation happens inside step bodies. `supabaseAsTestUser` in this
  repo is deliberately a fixture that returns an async *function*
  (`() => Promise<SupabaseClient>`), not a client directly, specifically so
  reading it doesn't race the page's own navigation. Call it
  (`await supabaseAsTestUser()`) only after a step has already navigated
  the page somewhere — calling it as literally the first action in a
  scenario (before any `page.goto`) still fails with a
  `SecurityError: Failed to read the 'localStorage' property` — navigate
  first (even just `workoutPage.open()`) if a Given step needs to seed data
  before anything else happens.

## 7. Authentication

This app has no conventional login for the BDD suite to exercise — every
scenario runs as the same reused anonymous Supabase session (see §6). Don't
add a real sign-in/sign-up flow to a BDD scenario's setup; that's what
`e2e/global-setup.ts` already does once, cheaply, for the whole run. Real
auth-flow behaviour (password reset, email confirmation, session
expiry) is covered by the hand-written `password-reset.spec.ts` and
`session-bootstrap.spec.ts` — extend those, or seed/mock at the Supabase
layer the same way they do, rather than routing BDD scenarios through a
real email round-trip.

## 8. Test data

Prefer literal, explicit values matching the `.feature` file's own Gherkin
text (exercise/programme names, numbers) — don't randomize unless a
scenario specifically calls for uniqueness. Where a scenario's literal
example name doesn't correspond to real seed data (e.g. an exercise name
that doesn't exist in `supabase/seed.sql`), fix the `.feature` file's
example to a real one rather than fabricating a step that "finds" a
nonexistent entity — this suite has already corrected one such case
(`"Overhead Press"` → `"Shoulder Press"`, verified against
`supabase/seed.sql`). Verify names against seed data before use rather than
guessing plausible-sounding ones.

## 9. Failure investigation

When `bddgen`/the `bdd` project reports multiple failures, group them by
root cause before touching individual steps — most failures in this suite
so far have come from a small number of shared causes:

- One `BasePage`/`openFromHome` navigation bug affecting every Page
  Object's `open()` (fixed once, in `BasePage`, not per-page).
- One async-write race pattern (§4) affecting several unrelated actions —
  fix the underlying wait pattern, not each symptom.
- One ambiguous-duplicate-step-text pattern (§2) affecting several
  scenarios that share Gherkin wording.

If a `.feature` file was added to `defineBddConfig`'s `features` array and
`bddgen` immediately reports many "missing step definitions" for scenarios
you never intended to implement yet, that almost always means the whole
file was included at file granularity — tag the specific out-of-scope
scenarios `@webgap`/`@specmismatch` (§5) rather than writing throwaway
steps just to make `bddgen` stop complaining.

## 10. Full-suite repair protocol

When asked to fix or extend this BDD suite:

1. Read the relevant `.feature` file(s), all matching step files, fixtures,
   Page Objects, and the real app screens involved (§1–2).
2. Inventory every step in scope: defined vs. undefined, and — for anything
   that looks like it should be excluded — whether it's a genuine
   `@webgap`/`@specmismatch` case (§5) rather than a bug to fix.
3. `pnpm exec bddgen`, then `pnpm exec playwright test --project=bdd`
   (scope with `--grep` while iterating on one scenario).
4. Collect every failure; group by root cause (§9) before editing.
5. Fix the underlying shared cause(s), not each symptom individually.
6. Re-run the specific scenarios just changed.
7. Re-run the full `bdd` project.
8. Also run `desktop-chromium`/`mobile` (`pnpm exec playwright test
   --project=desktop-chromium --project=mobile`) — a BDD-side fix must
   never regress the hand-written suite, and vice versa.
9. `pnpm run test:e2e:typecheck` and `pnpm run lint` — both must be clean
   (only pre-existing, unrelated warnings tolerated).
10. Repeat from step 4 until the full combined suite is green.
11. Do a final static pass: grep for any step text defined more than once,
    any `.feature` scenario with no matching step and no exclusion tag, and
    confirm `cucumber.json`/`.vscode/settings.json`'s Cucumber globs still
    match reality.
12. Report honestly what's covered, what's tagged `@webgap`/`@specmismatch`
    and why, and what's still fully undefined — never imply full coverage
    that wasn't actually verified by a green run.

**If Supabase's anonymous-sign-in rate limit is hit** (`AuthApiError:
Request rate limit reached` from `global-setup.ts`), this is an expected,
already-documented constraint from repeated runs in one hour — not a bug.
`e2e/.auth/state-*.json` files from an earlier successful run in the same
session remain valid; to keep verifying without waiting out the limit,
temporarily comment out `globalSetup` in `playwright.config.ts` to reuse
them, and **always restore it immediately after** — never leave it
disabled. Don't loop retrying `global-setup` itself to "wait out" the
limit; that only makes it worse.

Do not stop after the first scenario goes green — the protocol ends at a
full, combined, green run (step 10) plus the static audit (step 11), not
before.
