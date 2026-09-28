 ---
name: primeform-quality-engineering
description: >-
  PrimeForm's testing operating principles — which layer owns a given test
  (domain/unit, integration/API, Playwright acceptance, Android/device,
  manual exploratory, or agent-driven exploratory), when to add tests, and
  how to investigate a failure. Use this whenever adding tests for a new
  PrimeForm feature, deciding where a new test belongs, reviewing test
  coverage before changing existing behaviour, triaging a failing test
  (product defect vs test defect vs environment issue), or when a PR/change
  is adding "just one more" Playwright test for something that isn't really
  a UI concern. Trigger on phrases like "where should this test live",
  "should this be a Playwright test", "add a test for X", "this test is
  flaky", "why did CI fail", even without the words "QE" or "test strategy".
---

# PrimeForm Quality Engineering

PrimeForm already has a documented test-layer strategy and a real, lived
precedent for applying it. This skill is the operating summary — the full
reasoning lives in the referenced documents, which are the source of truth.
Read them rather than trusting this file's summaries if they ever disagree.

**Primary references** (read before making a layer decision on anything non-trivial):
- `TEST_AUTOMATION_STRATEGY.md` — the canonical layer taxonomy and what belongs in each layer.
- `E2E_PERFORMANCE_AUDIT.md` — a concrete, measured case study of applying "lowest appropriate layer" to this exact codebase (see below).
- `BDD_SPECIFICATION.md` — the BDD glossary, scenario style, and its own "what this specification deliberately excludes" section.
- `CURRENT_STATE.md` §9–§12 — prior audit of existing coverage and gaps; historical snapshot, not current status, but the reasoning holds.

## The layers, and who owns what

| Layer | Lives in | Command | Owns |
|---|---|---|---|
| Domain/unit | `packages/domain/src/__tests__/*`, `apps/mobile/**/__tests__/*` | `pnpm test` (root) or per-package `vitest run` | Pure calculations, business rules, component behaviour with a fake backend |
| Integration/API/data-layer | `apps/mobile/integration/*.test.ts` | `pnpm --filter @silver-fox/mobile test:integration` | Real Supabase round-trips (persistence, escaping, RLS-adjacent checks) with no browser |
| Playwright acceptance | `apps/mobile/e2e/journeys/*.spec.ts` | `pnpm --filter @silver-fox/mobile test:e2e` | Real user journeys through the real UI — the one thing only a browser can prove |
| Android/device | not yet automated — see `primeform-mobile-testing` skill | manual today | Real safe-area/system-nav/touch-target behaviour a browser viewport cannot see |
| Manual exploratory | — | — | Discovering behaviour/questions no automated layer surfaced yet (`BDD_DISCOVERY.md`'s "Known Questions" list is exactly this) |
| Agent-driven exploratory ("Flow Agent") | ad hoc, via the Claude Browser tool | — | Broad, unscripted UI walkthroughs to catch regressions no one specified a test for; not run on every change |

**Decide the layer before writing the test, not after.** Ask: does proving
this require a real browser? If the answer is no — it's a pure function, a
persistence/escaping question, or a data-shape check — it belongs at unit or
integration level, which is faster and more reliable.

## The concrete precedent: `E2E_PERFORMANCE_AUDIT.md`

Before that audit, 43 of 70 Playwright scenarios (61%) were input-validation
and persistence-safety checks running through a full browser boot — reps/RIR
boundary values, security-payload fuzzing, age-range checks. None of that
needed a browser: the reps/RIR filtering is a pure function
(`filterAndClampDigits` in `apps/mobile/components/SetRow.tsx`, unit-tested
directly), and the security-payload checks are a database-escaping question
(moved to `apps/mobile/integration/security-payloads.test.ts`, no browser).
Result: Playwright went from 70 scenarios / ~16 minutes to 32 scenarios /
~2 minutes, with **more** total coverage (the integration suite covers all
12 security payloads × 2 entity types; the old Playwright version tested an
arbitrary slice of 6 for one of them). This is the standard to hold new
tests to — not a one-time cleanup.

## BDD discipline

Gherkin in `apps/mobile/e2e/features/*.feature` is declarative business
behaviour only. Per `BDD_SPECIFICATION.md`'s own exclusion list: no
selectors, no screen/button/database/network references, no security-payload
fuzzing, no mobile-viewport/visual-layout concerns (those belong in the
mobile-testing layer, not Gherkin). The test: *would a non-technical product
person read this scenario and learn something true about how PrimeForm
behaves, without knowing anything about how it's built?* If not, it belongs
in a lower layer, not in a `.feature` file. Reuse the existing domain
glossary at the top of `BDD_SPECIFICATION.md` rather than inventing new terms.

## Test isolation and deterministic data

Playwright: each **worker** (not each test) gets its own isolated anonymous
Supabase user, minted once in `apps/mobile/e2e/global-setup.ts` — see that
file and `apps/mobile/e2e/support/fixtures.ts` for why (RLS scopes every
table to `auth.uid()`, so this is what makes parallel workers safe). New
Playwright specs should use the shared `readyPage` fixture from
`support/fixtures.ts`, not a fresh `browser.newContext()`, unless the test
genuinely needs an unauthenticated state (see
`e2e/journeys/demo-experience.spec.ts` for the documented exception and why).
Tag anything a test creates with the existing `RUN_TAG` export from
`support/fixtures.ts` and clean it up in `afterEach`, matching every existing
spec file. Unit/integration tests use the fakes in `apps/mobile/test/`
(`fakeSupabase.ts`, `mockAsyncStorage.ts`) — don't add a new mocking approach
without a concrete reason the existing one can't serve.

## Failure triage — never weaken a test to make it green

When a test fails, determine which of these it is before touching anything:
1. **Product defect** — the app is actually wrong. Fix the app.
2. **Test defect** — the test's own logic/assertion/locator is wrong. Fix the test, and verify the fix by re-running, not by assuming.
3. **Environment/flake** — confirmed by reproducing (or failing to reproduce) in isolation, away from whatever load or parallelism triggered it.

Concrete precedents from this project, all found by actually reproducing rather than guessing: a "reps input intercepts pointer events" Playwright failure on `android-pixel-7` turned out to be a real layout overflow bug in `SetRow.tsx` (the weight stepper's buttons scaled too wide for the row) — a product defect, fixed in the component, not the test. A `getByText("DEMO")` assertion failing on the welcome screen turned out to be the test's own over-broad case-insensitive substring match ("See a **demo**") — a test defect. A `SetRow.test.tsx` timeout that only reproduces under full parallel `turbo` load but passes standalone is environmental — documented, not "fixed" by raising the timeout blindly. Never adjust an assertion, add a `.skip`, or raise a timeout to hide a result you haven't actually explained.

## Avoid arbitrary waits

`page.waitForTimeout(n)` was removed from all 10 places it existed in this
suite (`E2E_PERFORMANCE_AUDIT.md` §6) — replaced with `expect.poll()` against
the actual condition, or a real UI-state assertion. Don't reintroduce a fixed
sleep; if something needs a moment to settle, wait for the specific signal
that means it has.

## Avoid duplicate coverage across layers

Before adding a test, grep for existing coverage of the same rule across
layers — `packages/domain/src/__tests__/`, `apps/mobile/**/__tests__/`,
`apps/mobile/integration/`, `apps/mobile/e2e/journeys/`. If the rule is
already proven at a lower layer, a Playwright test for the same rule should
only exist if it's proving something the lower layer can't (e.g. that the
real screen's wiring actually calls the validated function — see
`workout-logging.spec.ts`'s "reps field structurally rejects non-digit input
on the real screen (not just the unit-tested function)" for the pattern:
one thin acceptance check on top of full coverage underneath, not a second
full sweep of the same permutations).

## Don't over-engineer

No new test framework, mocking library, or page-object abstraction without a
concrete PrimeForm problem it solves. The existing patterns
(`fakeSupabase.ts`, `mockAsyncStorage.ts`, per-worker Playwright fixtures,
`RUN_TAG`-scoped cleanup) have already absorbed every real need so far.
