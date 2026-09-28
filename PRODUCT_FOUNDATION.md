# PrimeForm — Product Foundation

This document defines what PrimeForm fundamentally is at this stage, before any new feature work resumes. It is a planning document — nothing described as PROPOSED has been built. Detail on the auth/session mechanics lives in `AUTH_AND_STATE_MODEL.md`; the staged build-out lives in `CORE_IMPLEMENTATION_PLAN.md`. This document is the "why" and "what"; those two are the "how" and "when."

---

## CURRENT STATE (recap)

Full detail in `CURRENT_STATE.md`. The load-bearing facts for this document:

- Every install gets one automatic, anonymous Supabase identity on first launch. There is no logged-out state, no demo, and no distinction between "someone curious" and "someone with a real training history" — they are, architecturally, the same thing from the first second the app runs.
- The core workout model (Programme → Programme Day → Exercise/Programme Exercise → Workout → Set → History → Progress) is implemented and — for the most part — correctly scoped per owner at the database layer.
- The exercise model has good bones (a real muscle-group/equipment taxonomy, a `movement_pattern` field, and an already-existing `exercise_substitutions` table) but several fields needed for genuine substitution reasoning don't exist yet, and one existing field (`movement_pattern`) isn't structured enough to rely on.
- Input validation and error handling are inconsistent: weight is now well-modelled (a bounded, incrementing value); repetitions and reps-in-reserve are not; almost no screen tells a person why a save failed.

---

## What PrimeForm should fundamentally be at this stage

**PrimeForm is a small, honest training-log product**: a person follows a programme made of named training days, each day lists exercises with a target, they perform a workout and record what they actually did (weight, repetitions, and optionally effort), and PrimeForm keeps an accurate, private history of that so progress and personal records are visible over time. That's it. It is not yet a coaching product, an adaptive product, or a social product — those are all explicitly deferred (see below).

The one meaningful addition this milestone makes to that definition is **a real boundary between looking at PrimeForm and using it** — today that boundary doesn't exist (see `AUTH_AND_STATE_MODEL.md` for the full argument), and establishing it properly is treated as more foundational than any further workout-logging feature, because every other piece of this document depends on knowing whose data something is.

---

## PROPOSED STATE

### User states (summary — full detail in `AUTH_AND_STATE_MODEL.md`)

Three states, cleanly separated, with **no backend identity created until a person deliberately creates an account**:

1. **Logged out** — no account exists yet. Sees what PrimeForm is and can enter Demo. No data is written anywhere.
2. **Demo** — a realistic, clearly-labelled, read-mostly walkthrough of what a lived-in PrimeForm looks like. Entirely local to the device; never touches the real backend; cannot be mistaken for, or mixed with, a real account.
3. **Authenticated** — a real person with real credentials, real data, correctly isolated from every other authenticated person.

### The first-use journey

```
LOGGED OUT
  "PrimeForm helps you follow a programme, log your workouts, and see your progress."
  [See a demo]                         [Create account]  [Sign in]
       │                                       │               │
       ▼                                       ▼               ▼
   DEMO (local, labelled "Demo")          ACCOUNT CREATION  SIGN IN
       │                                       │               │
       │  "Create your own PrimeForm"          │               │
       └──────────────────────────────────────►│               │
                                                ▼               ▼
                                          AUTHENTICATED ("Use this programme" copies the demo
                                                          programme's structure only, or "Start fresh")
                                                │
                                                ▼
                                    person builds/chooses their own programme
                                    (today's existing "no programme selected" flow)
                                                │
                                          [Sign out] ──► LOGGED OUT
```

Two deliberate product decisions worth stating explicitly rather than leaving implicit:

- **Demo never persists, and never should.** Closing Demo and reopening it later shows the same starting point, not "where you left off" — because there is nothing genuinely "yours" to leave off from. This is a feature, not a limitation: it avoids ever implying a demo has been saved.
- **Creating an account offers to copy the demo programme's structure, or start empty — revised.** This section originally recommended always starting empty, on the assumption that "copying demo data" meant copying everything, including fabricated history. On reconsideration (see `FOUNDATION_DECISIONS.md`, Decision 1), a programme is a *plan*, not a *record* — copying one a person just liked doesn't misrepresent anything, unlike copying a fabricated history of having performed it. The corrected rule: **plans (programmes) may be copied; records (workout history, personal records, profile data) never are, under any circumstance.**

### What Demo concretely needs to contain

The brief says "enough data to demonstrate the product properly" without defining "enough." Left undefined, that scope will drift. Concretely:

- **One realistic programme** — reusing an actual built-in catalogue programme (e.g. "Foundation 40+") rather than inventing separate "demo-only" content. It's already real, public, well-formed data; there is no reason to build a second copy of it just for Demo.
- **A handful of finished workouts** (4–6, spread over 2–3 weeks) against that programme, with plausible weights/reps/effort progressing slightly over time — enough for Progress and History to show something real, not enough to need a content team.
- **One personal record** among those workouts, so the personal-record behaviour (`progress.feature`) is visible in the walkthrough, not just described.
- **One exercise whose fabricated history is shaped to trigger a visible progression suggestion** ("Suggested: increase weight — …"), added following `PROGRESSION_LOGIC_AUDIT.md`'s finding that this is a real, working, differentiating feature that the original content list overlooked.
- **A filled-in, plausible profile** (a name, an age, "intermediate" experience, a couple of goals) — enough to make the Profile screen feel inhabited.
- Nothing else. No demo-only exercises, no demo-only programmes, no fabricated conditioning/mobility history unless it's trivial to include (optional, not required).

### Core workout model — review findings

Reviewing Programme → Programme Day → Exercise → Workout → Sets → Completed Workout → History → Progress against the brief's own list of required fundamentals:

| Fundamental (from the brief) | Current state | Verdict |
|---|---|---|
| Creating/selecting a programme | Implemented, correctly owner-scoped | Solid |
| Viewing programme days | Implemented | Solid |
| Viewing exercises | Implemented, with search/filter | Solid |
| Starting a workout | Implemented, including confirm-before-discard and resume (confirmed via code during the recent BDD review) | Solid |
| Recording sets | Implemented | Solid |
| Recording weight | Implemented **well** — a bounded, whole-kilogram stepper, defaulting sensibly, clamped at zero. This was fixed during this project's testing work and should be treated as the model for reps/RIR (below), not revisited. | Solid |
| Recording repetitions | Implemented as unvalidated free text — any value is currently accepted with no check it's a sensible whole number | **Not solid — needs work this milestone** |
| Recording RIR | Same as repetitions — optional, but equally unvalidated when provided | **Not solid — needs work this milestone** |
| Completing a workout | Implemented; only completed sets are persisted | Solid |
| Viewing workout history | Implemented, correctly owner-scoped, persists correctly | Solid |
| Viewing progress | Implemented; correctly reflects only finished work; personal-record recognition confirmed present (via the recent BDD review) | Solid |
| Sensible validation | Present for names (recently fixed) and weight; **absent for repetitions, RIR, and most free-text fields** | **Systemic gap — needs work this milestone** |
| Sensible error handling | Present only at session-startup and the two recently-fixed name fields; **every other failed save is silent** | **Systemic gap — needs work this milestone, and arguably the single highest-value fix in the whole model** |
| Persistence across sessions | Solid for an authenticated person; **deliberately not applicable to Demo** (see above) | Solid, once the state model exists |

One additional finding, not on the brief's list but discovered by re-reading the domain code: a **programme exercise's target rep range is silently corrected** (the higher bound is raised to match the lower one) rather than rejected or explained if a person enters it backwards. This is a real, small, currently-ambiguous piece of behaviour (already flagged as an open question in `BDD_DISCOVERY.md`) that should be resolved as part of the validation work in this milestone — my recommendation is to reject it with an explanation rather than silently correct it, for consistency with how the rest of this milestone treats invalid input, but this is a product call, not purely technical.

**What I am not recommending changing**: the device-local, batch-write-on-finish design of an in-progress workout (`ActiveSessionProvider` + `sessionRepository`). This is genuinely good architecture — it means an abandoned workout costs nothing to discard, a finished one writes atomically, and there's no "half-written" workout state to ever clean up. Section 9 of the brief asks me to look for unnecessary complexity and bad models; this isn't one, and I'd flag it as a positive pattern worth keeping in mind when designing anything new (e.g. Demo's local data layer can follow the same "local until it's real" shape).

### Exercise model — metadata needed for future substitution

Current fields (from `supabase/migrations/20260918213631_exercises.sql`): name, primary muscle group (enum), secondary muscle groups (array), equipment (enum), rep unit, difficulty (enum), movement pattern (**free text**), description, instructions, form cues, common mistakes, progression/regression guidance, recommended rest, and a real (currently unused) `exercise_substitutions` table.

**Revised following a second review (`FOUNDATION_DECISIONS.md`, Decision 2): none of the proposed metadata changes are being made this milestone.** The original version of this section recommended converting `movement_pattern` to a constrained set and adding `is_compound`/`is_unilateral` now. On reconsideration, that was speculative: `movement_pattern` was confirmed (by reading the actual code, not assuming) to be used only as a display label today (`app/(tabs)/exercises/[exerciseId].tsx`) — nothing currently matches or filters on it — so structuring it now would be shaping schema for a substitution algorithm that doesn't exist yet and might want a different shape entirely. The `movement_pattern` conversion also requires a real data-audit migration; doing that once, when substitution's actual requirements are known, is cheaper than doing it now against a guess and potentially again later.

| Factor | Status | Recommendation |
|---|---|---|
| Primary muscle group | Already a proper enum | Keep as-is |
| Secondary muscle groups | Already an array | Keep as-is |
| Equipment | Already a proper enum | Keep as-is |
| Difficulty | Already a proper enum | Keep as-is |
| Movement pattern | Exists as free text; confirmed used only for display today | **Defer.** No current consumer needs it structured; revisit when substitution is actually designed. |
| Compound vs isolation | Does not exist | **Defer**, for the same reason — worth adding, but only once there's an algorithm to confirm a boolean is even the right shape. |
| Unilateral vs bilateral | Does not exist | **Defer**, same reasoning. (Incidental finding: some existing seed data already encodes this distinction inside its free-text movement pattern, e.g. "Unilateral Squat" — useful evidence for a future migration, not a reason to act now.) |
| Stability requirements | Does not exist | Defer, unchanged from the original review. |
| Loading characteristics | Does not exist | Defer, unchanged from the original review. |
| "Requires a particular piece of equipment" | Already covered by the existing `equipment` field | No change needed |

The existing, unused `exercise_substitutions` table remains the right place for actual substitution relationships once that work is scheduled — nothing about deferring the metadata changes affects that.

### Substitution — domain model only (not implemented this milestone)

The database already has the right shape for this: `exercise_substitutions` (`exercise_id`, `substitute_exercise_id`, `reason`) exists and is RLS-protected, but is currently written and read by nothing. The brief's worked example ("Bench Press" → Dumbbell Bench Press / Chest Press Machine / Push-ups, reasoned by movement pattern + primary muscle + equipment + compound/isolation, not just "same body part") describes exactly the kind of relationship this table is shaped to hold — a curated or later-computed set of substitution edges, each with a stated reason.

**Revised**: this milestone establishes nothing further toward substitution beyond confirming the existing `exercise_substitutions` table is the right eventual home for it (see Decision 2 in `FOUNDATION_DECISIONS.md` for why even the metadata fields are now deferred, not just the matching engine). No matching algorithm, no substitution UI, no automatic population of `exercise_substitutions`, and — on reconsideration — no metadata schema changes either, since none of them can be validated as the right shape without a concrete algorithm to design against.

---

## Explicit scope for this milestone

- A real three-state user model (logged out / demo / authenticated), replacing automatic anonymous sign-in.
- A local, non-persistent Demo experience built from existing built-in catalogue content plus a small amount of synthesized history.
- Repetitions and RIR brought up to the same validation standard as weight.
- Visible error handling for failed saves, at least for the highest-traffic actions (creating/editing a programme, exercise, or workout — the exact boundary is defined stage-by-stage in `CORE_IMPLEMENTATION_PLAN.md`), plus rounding the progression-suggestion's weight to a whole kilogram (`PROGRESSION_LOGIC_AUDIT.md`).
- "Use this programme" / "Start fresh" at account creation from Demo, copying programme structure only, never history (`FOUNDATION_DECISIONS.md`, Decision 1).
- Updating the BDD specification to describe the new states and re-verifying (this time genuinely, with two real accounts) the data-isolation scenarios that could only be asserted by inspection before.

## Things deliberately deferred

Exactly as the brief lists, plus a few identified during this review and its follow-up:

- AI workout generation, complex adaptation, nutrition, social features, gamification, wearables, large exercise databases, advanced analytics.
- The actual substitution matching/reasoning engine, **and now also its supporting metadata changes** (`is_compound`, `is_unilateral`, the `movement_pattern` conversion) — all deferred until substitution is actually being designed (`FOUNDATION_DECISIONS.md`, Decision 2).
- Stability-requirement and loading-characteristic exercise metadata (per above).
- Password reset — deferred to the milestone immediately after this one, not indefinitely, and requiring explicit product-owner sign-off given this project has no real account holders yet (`FOUNDATION_DECISIONS.md`, Decision 4).
- Migrating or preserving any existing anonymous-session test data — treated as low-risk given this is pre-launch, but flagged explicitly as an assumption worth confirming (`FOUNDATION_DECISIONS.md`, Decision 5).

Note: progressive-overload/next-workout suggestions are **not** on this deferred list — `PROGRESSION_LOGIC_AUDIT.md` confirmed the feature is live, working, and unaffected by the auth/state changes; only its one identified rounding bug (in scope) and its inclusion in Demo (in scope) touch this milestone.
