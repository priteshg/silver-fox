# Silverfox — BDD Specification

This document is the human-readable index to the Gherkin living documentation in `apps/mobile/e2e/features/`. It explains what each Feature covers, lists its Rules, and — critically — separates **current behaviour that is specified and automatable today** from **open product questions and known gaps** that are deliberately *not* written into the Gherkin as if they were settled.

The Gherkin itself is the source of truth for exact wording. This document explains it; it does not restate every scenario verbatim.

**This document was updated following a critical review — see `BDD_REVIEW.md`** for the full account of what was found and fixed (a terminology collision, a vague scenario, and five missing behaviours added with direct code evidence), and for the canonical domain glossary now enforced across every feature file.

---

## Domain terminology (glossary)

Used consistently across every feature file — a non-technical reader should be able to read any scenario using only this glossary.

| Term | Meaning |
|---|---|
| Session | What makes a person's data theirs in Silverfox, established automatically rather than via a login |
| Programme | A training plan, built-in or of a person's own design |
| Training Day | A named day within a programme (e.g. "Push"), containing exercises |
| Exercise | A movement, from Silverfox's shared library or added by a person |
| Target | The sets/rep range/effort/rest planned for an exercise within a training day |
| Workout | One occasion of performing a training day |
| Set | One completed unit of work: an exercise, a weight, repetitions, and optionally reps in reserve |
| Reps in reserve | How many more repetitions a person felt they could have done — an effort measure |
| Workout History | The record of a person's finished workouts |
| Progress | A summary of training trends, derived from Workout History |
| Conditioning Session | A logged cardio activity |
| Mobility Session | A logged mobility activity |
| Profile | A person's own recorded details about themselves |

---

## Features

### `starting_silverfox.feature` — **rewritten following Stage 1 (real authentication)**
**Why**: a person's training data must belong only to them, which now means a real account rather than an automatic, invisible one.
**Rules**: a first-time visitor sees what Silverfox does, signed into nothing · creating an account is the real path to using Silverfox · an existing account can sign in · a signed-in person is recognised automatically on return · signing out ends the session · an expired session is treated the same as signed out · connection failure is communicated with a retry option.
All seven rules reflect confirmed, **implemented** behaviour as of Stage 1 (`CORE_IMPLEMENTATION_PLAN.md`) — this replaces the previous version's "a session is established automatically," which described the now-removed automatic anonymous sign-in. IMPLEMENTED: sign-up, sign-in, sign-out, session restoration, expiry handling. NOT IMPLEMENTED (deferred to the next authentication-hardening milestone, per `FOUNDATION_DECISIONS.md` Decision 4): password reset — there is deliberately no scenario for it here, since one doesn't yet exist to describe truthfully.

### `demo_experience.feature` — **new**
**Why**: someone deciding whether to create an account should be able to see what Silverfox actually looks like first, without that curiosity creating a permanent account of its own.
**Rules**: anyone can enter the demo without an account · the demo is never associated with whoever looked at it.
Both rules reflect implemented, current behaviour — the demo is local-only content that never calls Supabase. **Deliberately minimal this stage**: the demo currently shows a fixed, static example rather than the fuller fabricated history/progress described in `PRODUCT_FOUNDATION.md`'s content list — that richer content is deferred to `CORE_IMPLEMENTATION_PLAN.md` Stage 3. **NOT covered by any scenario here** (deliberately — see the note in `IMPLEMENTATION_REPORT.md`): "Use this programme" and "Start fresh" at account creation. Both are specified in `PRODUCT_FOUNDATION.md`/`FOUNDATION_DECISIONS.md` as intended behaviour, but neither is implemented yet (deferred to Stage 4) — writing a scenario for either now would describe behaviour that doesn't exist, which this project's BDD work has consistently avoided doing.

### `data_privacy.feature`
**Why**: training data is personal — one person's Silverfox use must never expose or mix with another's.
**Rules**: programmes are private to a session · workout history is private to a session.
Both rules reflect confirmed, current behaviour. **Updated status following Stage 1**: these can now be exercised with two genuinely separate, real accounts rather than two anonymous sessions competing for Supabase's anonymous-sign-in rate limit — see `TEST_AUTOMATION_STRATEGY.md`. This removes the single largest obstacle to actually automating these two scenarios, though the automation itself is not yet written (Stage 1's scope was the state model, not the E2E rewrite).

### `programmes.feature`
**Why**: a person needs to know what training to do, whether that's Silverfox's own plan or one they've designed.
**Rules**: choosing a built-in programme · creating a custom one · editing a custom one's details · removing a custom one · built-in programmes cannot be changed or removed · a programme must have a name · a programme name has an 80-character limit.
All seven rules reflect confirmed, current behaviour, including the two naming rules, which were only made fully correct (a name too long is stopped, not silently lost) during the audit that preceded this specification.

### `programme_exercises.feature`
**Why**: the plan only becomes actionable once each exercise has a target.
**Rules**: an exercise added to a day has a target sets/rep range · that target can be changed later · an exercise can be removed from a day · exercises within a day can be reordered.
All four reflect confirmed, current behaviour. **Not included**: a rule about what happens if a target rep range is entered "backwards" — the current behaviour (silently corrected) is recorded as an open question in `BDD_DISCOVERY.md`, not asserted as a rule. **Moved out** (see `BDD_REVIEW.md` §2/§5): "a day with no exercises can't be started" now lives in `workouts.feature`, since its observable consequence belongs to the workout-starting capability, not exercise configuration.

### `exercise_library.feature`
**Why**: a person needs exercises to build their programme from, whether Silverfox's own or their own.
**Rules**: finding an exercise by search · a no-match search says so clearly · adding a custom exercise · an exercise must have a name · an exercise name has a 120-character limit.
All five reflect confirmed, current behaviour. **Not included**: editing or removing a custom exercise once created — no such capability exists today, so no rule can honestly be written about it (see Current Behaviour Gaps, below).

### `workouts.feature`
**Why**: a plan is only useful once it's actually performed.
**Rules**: starting a workout from a training day · a day with no exercises can't be started (moved in from `programme_exercises.feature`) · starting a new workout while one is in progress asks for confirmation · an unfinished workout can be resumed after leaving Silverfox · finishing a workout records it · abandoning a workout means it's never recorded.
All six reflect confirmed, current behaviour. The confirm-before-discarding and resume rules were added following `BDD_REVIEW.md`'s discovery pass, each backed by a direct code reference (`lib/startWorkout.ts`'s `confirmAndStart`, and Home's "Workout In Progress" resume affordance).

### `workout_sets.feature`
**Why**: this is where the actual training data is created — the heart of the application.
**Rules**: previous performance is visible while recording a new set · a completed set records weight and repetitions · a set needs repetitions to be completed · weight starts sensibly and moves in whole kilograms · weight can't go negative · reps in reserve are optional · a completed set can be corrected before the workout ends.
All seven reflect confirmed, current behaviour — including the weight-stepper rules, which describe behaviour introduced during the audit that preceded this specification, replacing a previously unvalidated free-text weight field. As of the Stage 2 core-journey audit, repetitions and reps-in-reserve are also digit-filtered and clamped to sensible maxima (999 reps, 10 RIR, matching the database's own constraint) as the value is typed, so the previously-noted gap here no longer applies.

### `workout_history.feature`
**Why**: a person needs to be able to look back at what they've actually done.
**Rules**: a finished workout appears in history · an abandoned one never does · history persists between visits · a completed workout's history entry matches what was actually recorded · changing a programme never rewrites a past workout.
The last two rules were added following the Stage 2 core-journey audit (`CORE_WORKOUT_AUDIT.md`): the first makes explicit that History renders the same `workouts`/`workout_sets` rows the workout actually wrote, not a recomputation; the second was verified by reading every write path into `workout_sets` and `workouts` and confirming programme-editing code never touches either table. Both reflect confirmed, current behaviour.

### `exercise_substitution.feature` — **new (Stage 3)**
**Why**: "I want to do this exercise, but the equipment isn't available" is a common, legitimate need, and the fix should be deterministic and explainable, not a silent guess.
**Rules**: a suitable alternative can be found when equipment isn't available · home/limited equipment constrains which alternatives are shown · Silverfox says so honestly when nothing suitable exists · substituting during a workout never changes the programme · the workout records what was actually performed, not what was planned · a substitution can be reconsidered (swapped again, or cancelled outright) as long as nothing has been logged yet · once a set is logged for an exercise, substituting it is no longer offered.
All reflect implemented, current behaviour as of Stage 3 (see `EXERCISE_SUBSTITUTION_SPEC.md` for the full domain model, ranking rules, and rationale). The matching/ranking logic itself (`findSubstitutes` in `packages/domain`) is exhaustively covered by domain tests rather than Gherkin — these scenarios stay at the level of what a person experiences, not which factors a candidate scored on.

### `progress.feature`
**Why**: raw history isn't the same as understanding whether training is working.
**Rules**: progress reflects only finished, recorded training · a new best result is recognised as a personal record (added following `BDD_REVIEW.md`'s discovery pass, backed by `calculateCurrentRecords`).
Both reflect confirmed, current behaviour. **Not included**: any rule connecting a person's Profile to what Progress shows — no such connection exists in the code, and none is claimed here (see `BDD_DISCOVERY.md`, Unknown/Undecided #6); nor a rule about progressive-overload/next-workout suggestions, which needs its own discovery pass before it can be specified (see `BDD_REVIEW.md` §6).

### `conditioning.feature`
**Why**: training isn't only strength work.
**Rules**: logging a cardio session · logging a mobility session.
Both reflect confirmed, current behaviour. Kept deliberately small — this is a genuinely simple capability, and the Gherkin doesn't need padding to look thorough.

### `profile.feature`
**Why**: Silverfox should reflect who the person actually is.
**Rules**: recording/updating personal details · age must be realistic (13–120, demonstrated with a Scenario Outline since all four examples serve the one rule).
Both rules reflect confirmed, current behaviour. As of the Stage 2 core-journey audit, an out-of-range age is now rejected with a visible message (`Age must be between 13 and 120.`) rather than being silently dropped — the previously-noted gap about the person not being told why no longer applies.

---

## Current Behaviour Gaps (deliberately not written into the Gherkin as rules)

Per the instruction not to convert a bug into a requirement, the following are recorded here — as current behaviour plus an open question — rather than as scenarios in any `.feature` file:

| Area | Current behaviour | Potential product rule | Status |
|---|---|---|---|
| Most free-text fields (descriptions, notes, day names) | Length limits exist only at the point of saving, invisibly; several fields still have no visible limit or message at all | Every field with a limit should communicate it before or at the point of failure | Requires product decision |
| Custom exercises | Cannot currently be edited or removed once created | Should exercises support the same edit/remove capability programmes have? | Requires product decision |
| Completed workouts / measurements / photos | Cannot currently be edited or removed once saved | Should any of these be correctable after the fact? | Requires product decision |
| Signing out / ending a session | No such capability exists | Is a session meant to be permanent for the life of the device? | Requires product decision |

None of the above appear as "rejected"/"invalid" scenarios in the feature files, and none appear as "accepted, and that's fine" scenarios either — writing either would assert a rule that doesn't actually exist yet.

Resolved since the last revision (Stage 2 core-journey audit, `CORE_WORKOUT_AUDIT.md`): repetitions and reps-in-reserve now reject non-numeric input and clamp to sensible maxima as the value is typed (see `workout_sets.feature`); an out-of-range age is now rejected with a visible message instead of being silently dropped (see `profile.feature`); a programme-exercise rep range entered backwards is now structurally unreachable rather than silently corrected (the Low/High controls are coupled) — none of these needed a new Gherkin rule since they're refinements of existing rules already in the feature files, not new behaviour.

---

## Known Unanswered Questions

Carried forward from `BDD_DISCOVERY.md` (repeated here for visibility, not re-derived):

1. Is "no credentials, ever" permanent, or a placeholder?
2. Should a session be transferable between devices?
3. Should Silverfox always explain a rejected input, and how?
4. Should repetitions/reps-in-reserve get the same structural protection as weight, or explicit validation instead?
5. Should custom exercises become editable/removable?
6. Does (or should) Profile influence recommendations or progression?
7. Is the 80/120-character name limit a meaningful design decision or an arbitrary current value?
8. What should happen when a rep range is entered backwards?

---

## What this specification deliberately excludes

- **Security/fuzz testing** (SQL-like input, script tags, extremely long strings, malformed numeric input) — these are legitimate quality checks but are not business behaviour, and are specified separately in `TEST_AUTOMATION_STRATEGY.md`.
- **Any mention of the technology Silverfox is built with.** Every scenario in every feature file should still make sense if Silverfox were rebuilt on entirely different technology — none references a screen, a button, a database, or a network call.
- **Mobile-viewport/visual layout concerns** (e.g. whether the navigation bar overlaps a device's own system bar) — these are implementation-level quality concerns, not user-observable business behaviour in the Gherkin sense, and belong in the automation strategy's visual/mobile testing layer instead.
