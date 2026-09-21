# Exercise Substitution — Spec (Stage 3)

Date: 2026-09-20. Written after `EXERCISE_SUBSTITUTION_AUDIT.md`; every design decision below references a specific audit finding rather than assuming one.

## 1. Problem definition

"I want to do this exercise, but the equipment isn't available." The fix must be deterministic and explainable — no AI, no semantic search, no scoring the user can't see the reasoning behind. A recommended substitute must be a genuinely related exercise (same movement pattern, same primary target), not merely "trains the same body part."

## 2. Exercise domain model — what's added, what isn't

Per audit §1/§9, the existing fields (`primaryMuscleGroup`, `secondaryMuscleGroups`, `equipment`, `difficulty`) are sufficient and unchanged. Two changes:

**Changed**: `movementPattern` goes from unconstrained free text to a constrained union (§4).

**Added**: `laterality: "unilateral" | "bilateral"`, not null, default `"bilateral"`.

Justification for adding exactly this one new field and nothing else: the brief's own worked example — Leg Press → Hack Squat → Goblet Squat → Bulgarian Split Squat — deliberately orders a unilateral movement *last*, after three bilateral options. Without a laterality signal, nothing in the model distinguishes "trains legs via a squat pattern, bilaterally" from "trains legs via a squat pattern, one leg at a time" — a Bulgarian Split Squat could rank above a Goblet Squat purely by accident of alphabetical order or curation-list position. This is a concrete requirement demonstrated by the brief's own example, not a speculative addition.

**Explicitly not added**: compound/isolation as its own field. Every one of the 32 seed exercises' current free-text `movementPattern` values classifies cleanly into the taxonomy in §4, where `"isolation"` is itself one of the twelve values (alongside `squat`, `hinge`, `horizontal_push`, etc.) rather than a second, overlapping axis. A Leg Press and a Bulgarian Split Squat are both compound and both `"squat"`; a Bicep Curl and a Cable Crunch are both isolation and land in the `"isolation"` bucket, distinguished from each other by `primaryMuscleGroup` (already a field), not by a redundant compound/isolation flag. No current substitution scenario needs a signal that movement pattern doesn't already carry. If a real gap surfaces later (e.g. a compound movement that isn't well-served by any of the twelve patterns), it can be added then, backed by a real example — not now, speculatively.

**Explicitly not added**: "stability score", "loading characteristics", or anything similar — nothing in the brief's examples or the audit's findings demonstrates a need for them.

## 3. Equipment model

Reuse `User.availableEquipment?: Equipment[]` exactly as it exists today (audit §7) — it is already the right shape (a subset of the same 8-value `Equipment` enum every exercise already uses) and is already collected on the Profile screen; it has simply never been read by anything. It becomes the **default pre-fill** for a substitution request's equipment checklist.

The substitution flow itself asks a fresh, editable question each time — "gym is busy today" and "my permanent home setup" are both just "which equipment can I use right now," and the checklist may legitimately differ from the profile default on any given day. The checklist's selections are **not written back to the profile**; they're scoped to that one substitution request.

`"bodyweight"` is always treated as available regardless of what's checked — a bodyweight exercise never becomes unavailable, since it requires nothing to unlock.

**Not modeled in v1**: a separate "bench" equipment type, or a multi-equipment requirement per exercise (e.g. "needs dumbbell *and* bench"). None of the three worked examples in the brief actually turn on a bench-specific distinction — the equipment that becomes unavailable in every example is barbell, machine, or cable, not bench access. Adding a second equipment dimension per exercise with no example that needs it would be exactly the kind of speculative schema the brief says to avoid. Flagged as an open question (§11) for a later version if it turns out to matter in practice.

**Not modeled in v1**: a separate "why do you need a substitute" reason selector (equipment unavailable / training at home / don't own it). Mechanically, all three reduce to the same operation — filter by available equipment — so asking for a reason before asking for equipment would add a screen without changing behaviour. The UX in §8 asks for equipment directly, once, pre-filled from the profile.

## 4. Movement pattern model

Replacing free text with this constrained set (12 values):

```
horizontal_push · vertical_push · horizontal_pull · vertical_pull ·
squat · hinge · lunge · carry · rotation · anti_rotation · isolation · other
```

This is the brief's own suggested list, kept as-is after actively trying to break it against real data (audit §2's 19 distinct free-text values in current use). Every one maps cleanly:

| Current free text | Maps to |
|---|---|
| Horizontal Push, Incline Push | `horizontal_push` |
| Vertical Push | `vertical_push` |
| Horizontal Pull, Rear Delt / Upper Back | `horizontal_pull` |
| Vertical Pull | `vertical_pull` |
| Knee-Dominant Squat | `squat` (laterality now lives in its own field, §2) |
| Hip Hinge | `hinge` |
| Loaded Carry | `carry` |
| Anti-Rotation | `anti_rotation` |
| Shoulder Isolation, Elbow Flexion, Elbow Extension, Hamstring Isolation, Knee Isolation, Ankle Extension, Horizontal Isolation, Spinal Flexion | `isolation` |
| Core Stability | `other` |

The joint-action-level detail that used to live in the free text (`Elbow Flexion` vs `Elbow Extension` vs `Knee Isolation`) is fully recoverable from `isolation` + `primaryMuscleGroup` — a Bicep Curl (`isolation` + `biceps`) and a Leg Extension (`isolation` + `legs`) don't need different movement-pattern values to be distinguishable; they're already distinguished by muscle group, which is the field that actually matters for isolation-exercise substitution. Collapsing joint-action granularity into one `isolation` bucket loses nothing a substitution decision needs.

`lunge` is used by exactly one current exercise: Walking Lunge, currently classified as `"Unilateral Squat"`. On inspection this is a mislabel worth correcting rather than preserving — a walking lunge is a genuinely different movement pattern from a squat (a stepping, alternating-leg pattern, not a two-footed descent-and-drive), and the taxonomy has a dedicated bucket for exactly this. Reclassified to `movementPattern: "lunge"`, `laterality: "unilateral"`.

`other` is kept as an explicit escape hatch (not a compromise) for the small number of exercises — currently just the Plank — that are genuinely not any of the eleven other patterns. Movement-pattern matching for these degrades to muscle-group + equipment matching only, which is the correct, honest behaviour rather than mis-classifying an isometric brace as a squat or a pull.

## 5. Substitution rules

**Hard filters** — a candidate that fails any of these is not shown at all:

1. Not the exercise being replaced.
2. Same `primaryMuscleGroup` as the original. This is the one non-negotiable: a "substitute" that doesn't train the same primary target isn't a substitute, it's a different exercise. (Matches the brief's "primary training target" requirement, applied as a hard rule rather than a ranking factor — soft-ranking this would let a same-pattern-wrong-muscle exercise outrank a same-muscle-different-pattern one, which is backwards.)
3. If an equipment set was supplied: candidate's `equipment` must be in that set, or be `"bodyweight"`. If no equipment set was supplied (an unconstrained "show me alternatives" request), this filter is skipped entirely.
4. Candidate must have `movementPattern` set. This is what keeps under-specified custom exercises out of *auto-suggested* results (§7) without deleting or hiding them from the app generally.

Movement pattern is deliberately **not** a hard filter. Making it one would mean an equipment-constrained request with no same-pattern option left returns nothing instead of the next-best (same-muscle, different-pattern) option — a strictly worse outcome than ranking it lower. "Generally preserve" (the brief's own words) is a ranking preference, not an exclusion rule.

**Ranking score**, applied only to candidates that survive the hard filters, highest first, alphabetical-by-name as a deterministic tie-break:

| Factor | Points | Rationale |
|---|---|---|
| Same `movementPattern` as original | +3 | The dominant signal — this is what "meaningfully related" means in practice |
| Any overlap between candidate's muscles (primary + secondary) and the original's muscles (primary + secondary) | +2 | Rewards a genuinely similar exercise over one that merely shares a primary muscle by coincidence |
| Same `laterality` as original | +2 | See §2 — keeps bilateral-for-bilateral the default, unilateral ranked below unless nothing else is available |
| Same `difficulty` (or either side unset) | +1 | A small nudge toward an appropriately-pitched swap, never a hard requirement |
| Candidate appears in `exercise_substitutions` for this exercise (curated) | +1 | The hybrid bonus — a human-curated relationship counts for something on top of metadata, without being the only path to a result |

No factor is hidden: every point that contributed to a candidate's rank is surfaced in its explanation (§6). This is a small, fixed rule table, not a trained or opaque model — exactly what the brief asks for.

## 6. Explanations

Every ranked candidate carries a plain-English reason built directly from which factors matched, e.g.:

> "Trains the same movement pattern and primary muscle, using dumbbells instead of a barbell."

> "Trains the same primary muscle. Uses different equipment (machine) and a different movement pattern, so it's a looser match."

> "Recommended because it's a coach-suggested substitute for Bench Press, and trains the same movement pattern and primary muscle."

The sentence is assembled, not templated per-exercise — see `explainSubstitution` in the implementation.

## 7. Programme vs workout — confirmed model

Per audit §6, the existing session architecture already supports this correctly with **zero changes to `programs`, `program_exercises`, `workouts`, or `workout_sets`**:

- A programme's `ProgramExercise.exerciseId` is never touched by a substitution.
- `SessionExercise.exerciseId` (in-memory/AsyncStorage-persisted, per active workout) is what changes.
- `finishSession()` already builds each persisted `WorkoutSet.exerciseId` from `SessionExercise.exerciseId`, so history and progress automatically reflect the substituted exercise, with no changes to that function.
- `SessionExercise.programExerciseId` — a pointer back to the originating programme slot — is untouched by substitution, so "which programme slot was this" remains answerable even after a swap.

This confirms the model the brief describes is correct, and is the cheapest possible implementation of it: one new field on `SessionExercise` (`originalExerciseId`, set once, on first substitution) and one new pure function (`substituteExercise`), following the exact pattern `updateExerciseTarget` already establishes.

**Rule**: substitution is only available for an exercise slot with **zero completed sets** in the current session. Once a set has been logged against a slot, swapping the exercise underneath it would mean one workout "exercise" contains sets from two different exercises with no way to tell them apart in the UI's flow (and no clean product answer for what target/rep-range should apply to sets already logged under the old exercise). Deciding up front — before doing any work — is also how this is used in practice: "the bench is taken" is known before the first rep, not after the third set. Enforced both in the UI (the swap action is hidden/disabled once any set is complete) and in the domain function itself (`substituteExercise` is a no-op if this precondition fails), so it can't be bypassed by any future caller.

## 8. Custom exercises

Confirmed via audit §5: today, a custom exercise never gets `movementPattern` or `difficulty` set — the creation form doesn't ask. Two things follow:

1. **Auto-suggestion**: a custom exercise without `movementPattern` is excluded from ranked candidates (hard filter §5.4) but remains fully usable — it still shows up if the user browses the full library manually (§9's fallback link). It's never deleted, hidden, or degraded in any other part of the app.
2. **Opt-in participation**: the custom-exercise creation form gains two new optional fields — movement pattern (a chip select over the 12 values, defaulting to unselected) and laterality (a two-way toggle, defaulting to Bilateral, since most exercises are). A custom exercise with these filled in participates in ranking exactly like a built-in one, including being suggested as a substitute for *other* exercises.

This directly matches the brief's own suggested approach in point 7, confirmed by the audit rather than assumed.

## 9. `exercise_substitutions` table — decision

**Hybrid**, matching the brief's stated preference, and confirmed by audit §3 as already correctly designed for this: metadata (§5) generates every candidate and its base score; a curated row in `exercise_substitutions` adds +1 on top for a specific pair. No new table, no schema change to this table — it already has the right shape (directional, with an optional `reason`, RLS already read-scoped correctly). What's added: actual curated rows for the three worked examples in the brief (§10), so the exact chains given produce sensible results out of the box, plus RLS remains read-only for now (curating substitution pairs through the app UI is out of scope for this stage — nothing in the brief asks a user to author these relationships themselves).

## 10. New exercises

Per audit §4, four exercises named directly in the brief's own examples don't exist: Push-ups, Hack Squat, Bulgarian Split Squat, Barbell Row, One-Arm Dumbbell Row (five, not four — corrected count). Adding these five, fully classified with the new taxonomy, so the three worked examples are real and testable rather than hypothetical:

| Exercise | Muscle | Equipment | Pattern | Laterality |
|---|---|---|---|---|
| Push-Up | chest | bodyweight | horizontal_push | bilateral |
| Hack Squat | legs | machine | squat | bilateral |
| Bulgarian Split Squat | legs | dumbbell | squat | unilateral |
| Barbell Row | back | barbell | horizontal_pull | bilateral |
| One-Arm Dumbbell Row | back | dumbbell | horizontal_pull | unilateral |

Every existing built-in exercise is reclassified from its current free-text `movementPattern` into the new taxonomy per the table in §4, and given a `laterality` (bilateral for all of them except Walking Lunge and the new Bulgarian Split Squat/One-Arm Dumbbell Row, which are unilateral).

## 11. UX flow

From the active workout screen, each exercise gets a "Swap exercise" action, visible only while that exercise has zero completed sets (§7). Tapping it opens a single screen:

```
Replace Bench Press

Available equipment
☑ Dumbbells   ☑ Bench
☐ Barbell     ☐ Cable machine
☐ Machines    ☐ Kettlebell
☐ Band

  (pre-filled from your profile — edit for just this swap)

Suggested alternatives
┌─────────────────────────────────────────┐
│ Dumbbell Bench Press                     │
│ Trains the same movement pattern and     │
│ primary muscle, using dumbbells instead  │
│ of a barbell.                            │
│                              [ Use this ]│
├─────────────────────────────────────────┤
│ Push-Up                                  │
│ Trains the same movement pattern and     │
│ primary muscle, using bodyweight instead │
│ of a barbell.                            │
│                              [ Use this ]│
└─────────────────────────────────────────┘

No matches? Browse the full exercise library →
Cancel
```

Selecting one calls `substituteExercise`, then returns to the workout screen with that slot now showing the new exercise, same targets, no sets discarded (there are none, by §7's rule). "Cancel" or the back button leaves the session completely unchanged. If a swap has already happened this session for a slot, that screen also offers "Revert to Bench Press."

## 12. BDD scenarios

```gherkin
Feature: Substituting an exercise during a workout

  Rule: A person can find a suitable alternative when equipment isn't available

    Scenario: Substitute an unavailable exercise
      Given today's workout contains Bench Press
      When I choose to substitute the exercise
      Then Silverfox shows suitable alternatives

    Scenario: Home equipment limits which alternatives are shown
      Given I am training at home
      And I only have dumbbells available
      When I request an alternative to Bench Press
      Then Silverfox only recommends alternatives that use dumbbells or bodyweight

    Scenario: No suitable alternative exists
      Given I only have equipment that trains a different muscle group entirely
      When I request an alternative to Bench Press
      Then Silverfox tells me no suitable alternative was found

  Rule: Substitution preserves the programme

    Scenario: Substitution preserves the programme
      Given my programme contains Bench Press
      When I substitute it with Dumbbell Bench Press during a workout
      Then today's workout uses Dumbbell Bench Press
      And my programme still contains Bench Press

  Rule: The workout records what was actually performed

    Scenario: Substitution records what actually happened
      Given I substituted Bench Press with Dumbbell Bench Press
      When I complete the workout
      Then my workout history records Dumbbell Bench Press

  Rule: A substitution can be reconsidered before any work is logged

    Scenario: Cancelling a substitution changes nothing
      Given today's workout contains Bench Press
      When I open the substitute screen and cancel
      Then today's workout still contains Bench Press

    Scenario: A substitution can be swapped again before logging a set
      Given I substituted Bench Press with Dumbbell Bench Press
      And I have not logged any set yet
      When I substitute again with Push-Up
      Then today's workout uses Push-Up

  Rule: A substitution cannot be made once work has been logged for that exercise

    Scenario: Substitution is unavailable after a set is logged
      Given I have logged a completed set of Bench Press today
      Then I am not offered a way to substitute that exercise
```

## 13. Test plan

**Domain (`packages/domain`)** — the matching/ranking logic and the session mutation, both pure functions, both fully unit-testable without any UI or database:
- hard filters: excludes the original exercise, excludes a different-muscle exercise, excludes equipment the user doesn't have (except bodyweight, always allowed), excludes a candidate with no `movementPattern`
- ranking: same-pattern beats different-pattern; same-laterality beats different; curated relationship adds its bonus; alphabetical tie-break is deterministic
- explanation text reflects exactly the factors that matched (no equipment clause when equipment is identical; no curated clause when not curated)
- no candidates survive filtering → empty result, not an error
- `substituteExercise`: changes `exerciseId`, sets `originalExerciseId` once and keeps it stable across a second substitution, no-ops when a set is already completed for that slot
- `revertSubstitution`: restores the original, clears the marker
- `finishSession` after a substitution persists the substituted `exerciseId`, not the original — an explicit regression test for the core "workout records what happened" guarantee
- a substitution never mutates any `ProgramExercise`-shaped object passed in (asserted directly, not just assumed)

**Mobile unit tests**: the new movement-pattern/laterality chip fields on the custom-exercise form save correctly; the repository layer round-trips the new `laterality` column and the constrained `movementPattern` values.

**E2E (Playwright)** — the important journeys only, per the brief's own instruction not to browser-test every permutation the domain tests already cover:
1. Substitute Bench Press mid-workout, with equipment constrained to dumbbells → Dumbbell Bench Press or Push-Up is offered, Machine Chest Press is not.
2. After substituting and finishing the workout, history shows the substituted exercise; the programme (re-opened separately) still shows Bench Press.
3. Cancel a substitution → workout unchanged.
4. Log a set, then confirm the substitute action is no longer offered for that exercise.

## 14. Open questions (deliberately not resolved this stage)

- Whether equipment needs a second dimension (e.g. "needs a bench" as well as a primary equipment type) — no current example requires it; revisit if a real substitution case turns out to need it.
- Whether users should be able to curate their own `exercise_substitutions` rows (e.g. "always suggest X instead of Y for me") — no RLS write policy is added for this table in this stage; it stays seed/curated-only.
- Whether `lunge` needs real exercises behind it — kept in the taxonomy for completeness even though nothing currently uses it.
- Whether a rejected/dismissed suggestion should be remembered ("don't suggest this again") — no such mechanism exists or is added; every substitution request is independent.
