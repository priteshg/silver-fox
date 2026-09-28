# PrimeForm — Test Automation Strategy

This document explains how `BDD_SPECIFICATION.md` and the feature files in `apps/mobile/e2e/features/` will eventually be automated, and — just as importantly — what should **not** be automated as BDD at all. Nothing in this document has been implemented yet; this is the plan, produced before any automation work, per the agreed flow:

```
DISCOVERY → CONCRETE EXAMPLES → BUSINESS RULES → GHERKIN → AGREEMENT → AUTOMATION → IMPLEMENTATION
```

We are currently at "AGREEMENT ON BEHAVIOUR" — this document describes the next two steps without performing them.

---

## The layers, and what belongs in each

### 1. BDD acceptance examples (the feature files themselves)
**What**: exactly the scenarios in `apps/mobile/e2e/features/*.feature` — one concrete example per business rule, written in PrimeForm's own domain language.
**How they'd be automated**: each Given/When/Then step gets a step definition that translates the domain language into whatever the current implementation requires (today: driving the real application through its UI, since there's no separate API layer — see `CURRENT_STATE.md` §1). The step definitions own every implementation detail; the feature files must never change because of *how* a step is automated, only because *what PrimeForm does* has changed.
**Ownership boundary**: if automating a scenario would require adding a technical detail (a screen name, a field type) into the `.feature` file itself to make it possible, that's a signal the step definition needs to get smarter — not that the Gherkin should get more technical.
**Note on the existing suite**: `apps/mobile/e2e/journeys/*.spec.ts` (66 Playwright tests, currently passing) already automates a large amount of this same behaviour, but as procedural test scripts rather than BDD step definitions — it was not written from a domain-first discovery process, and mixes business behaviour with technical/security checks in the same files. It should **not** be deleted or assumed obsolete: it's real, working coverage. The recommended path is to grow the new BDD layer alongside it and gradually retire the overlapping procedural specs once their behaviour is represented in Gherkin — not a rewrite in one pass.

### 2. UI/E2E tests
**What**: automation that actually drives the real application (today, a browser-driven Expo web build) to prove the BDD examples hold end to end, plus lower-level UI concerns that aren't business rules at all (e.g. "does this element remain visible after a page reload," "does a specific screen transition happen").
**Relationship to BDD**: this is the *automation* of the BDD layer for scenarios where driving the real UI is the only realistic way to observe the behaviour (e.g. "I cannot type more than 80 characters" is inherently a UI-observable fact). Some BDD scenarios (see layer 3) are better served by skipping the UI entirely.
**Not BDD**: exact navigation paths, element identification strategy, wait/timing handling — all of this lives in step definitions and page-object-style helpers, never in a `.feature` file.

### 3. API/integration tests
**What**: tests that exercise the same rules the BDD layer describes, but by talking to PrimeForm's data layer directly rather than through the UI — faster, and the only realistic way to test some rules properly.
**Where this matters most**: the **data privacy** rules (`data_privacy.feature`). Proving "one person's programme is invisible to another" properly requires two genuinely distinct, real sessions acting concurrently — something the current single-shared-test-user Playwright suite cannot do (see `CURRENT_STATE.md` §9/§11, the single highest-value gap identified in that audit). This layer should create two real sessions, have one create data, and assert the other cannot read it — directly, not through a UI click-path.
**Also suitable for**: exercising every CHECK-constraint-backed rule (name length limits, age range, rep-range ordering) at the data layer, as a fast confirmation layer underneath the slower UI-level BDD scenario for the same rule.

### 4. Unit / logic tests
**What**: the pure-function tests already in `packages/domain/src/__tests__/*` (progression, PRs, volume, consistency, session-state transitions) and `packages/validation/src/__tests__/*`. Keep exactly as-is; this layer is fast, reliable, and correctly scoped already.
**Relationship to BDD**: these tests verify the *calculations* behind rules like "progress reflects finished training" at a level of detail the BDD layer deliberately doesn't — the BDD scenario proves the rule is observable to a person; the unit test proves the arithmetic behind it is correct for every input that matters.

### 5. Database tests
**What**: a currently-missing layer that would exercise RLS policies and constraints directly against Postgres (e.g. via a tool that can assert on raw SQL behaviour), independent of the application code entirely.
**Why it matters**: `CURRENT_STATE.md` §9 identified that no such layer currently exists — every claim about RLS correctness in that audit came from *reading* the policies, not from a test proving them. This is the most rigorous way to prove data-isolation rules, complementing (not replacing) the API/integration-layer version of the same proof in layer 3.

### 6. Security tests
**What**: SQL-like, HTML-like, script-tag, path-traversal, null-byte, and Unicode-edge-case payloads submitted to every free-text field, verifying PrimeForm stores them inertly as text (or rejects them clearly) and never executes, corrupts, or crashes on them. Also: confirming the boundary between what an anonymous (no-session) request can and cannot read matches the intended public/private split.
**Explicitly not BDD**: these are technical robustness checks, not business behaviour a product person would recognise or care to read as living documentation. The existing Playwright suite already has a working version of this (the `SECURITY_PAYLOADS` fuzzing in `programme-crud.spec.ts`/`exercise-library.spec.ts`) — that pattern should continue to live at this layer, separate from the new BDD feature files, exactly as it does today.

### 7. Input fuzzing
**What**: broader automated exploration of boundary and malformed values (extremely long strings, zero, negative numbers, decimals where integers are expected, empty vs whitespace-only) beyond the specific concrete examples the BDD layer uses to illustrate each rule.
**Relationship to BDD**: a BDD scenario picks *one* meaningful example per rule (e.g. "a weight of 0 kg can't go lower"); fuzzing exists to find rules that *should* exist but don't yet, or edge cases the concrete examples don't cover. Findings from fuzzing that reveal a genuine, confirmed product rule graduate into a new BDD scenario; findings that reveal an open question go back into `BDD_DISCOVERY.md`'s Unknown/Undecided list, not straight into a feature file.

### 8. Visual / mobile tests
**What**: device- and viewport-specific rendering checks — most notably, whether the bottom navigation stays clear of a real device's own system navigation area, which `CURRENT_STATE.md` §11 identified as unverifiable by any tool available to this project's browser-based suite. This layer would need real device or emulator testing, not a browser.
**Explicitly not BDD**: "does this pixel region overlap that pixel region" is never a business rule.

### 9. Exploratory testing
**What**: unscripted, human-led testing — the appropriate way to keep discovering behaviour and questions that neither the automated layers nor this discovery pass surfaced. Every "Known Question" in `BDD_DISCOVERY.md` is a natural exploratory-testing prompt: try the ambiguous case, see what actually happens, bring back a concrete example.

---

## Guardrail: keeping the BDD layer honest over time

As PrimeForm changes, the temptation will be to add "just one more scenario" to a feature file for something that's really a technical test. Before adding any scenario, ask the same question this whole exercise was built around:

> **Would a non-technical product person read this scenario and learn something true about how PrimeForm behaves for a person using it — without needing to know anything about how it's built?**

If the honest answer is no, the scenario belongs in one of layers 2–9 above, not in `apps/mobile/e2e/features/`.
