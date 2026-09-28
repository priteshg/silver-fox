# PrimeForm — Progression Logic Audit

Investigation only. Nothing in this document has been changed, fixed, or built. Every claim below is traced to a specific file and line, not inferred from naming or prior documentation — the prior reference to this capability (`apps/mobile/e2e/JOURNEY_INVENTORY.md`, journey #8: "Progressive overload suggestion — display and tap-to-apply") was treated as a lead to verify, not a fact to repeat.

---

## CURRENT BEHAVIOUR

While performing a workout, for whichever exercise is currently active, PrimeForm looks at that exercise's most recent prior session and — if one exists — shows a single line: **"Suggested: {weight} kg — {reason}"**, with a tap action labelled "Use for next set." Tapping it pre-fills the weight for the next not-yet-logged set of that exercise with the suggested number. It does not touch reps or RIR, does not affect any other exercise, and does not persist anywhere — it is recomputed fresh every time the screen renders, from that exercise's history at that moment.

Separately, and unrelated to weight suggestions: Home's "today's training day" (which day of the programme is presented as "today") rotates through the programme's days in a fixed order based on which day was last completed — this is also sometimes described loosely as "next workout" logic, but it has nothing to do with load progression. Documented here only to avoid the two being conflated, since the audit's own search terms ("next workout") match both.

## IMPLEMENTATION

Three files, cleanly separated by responsibility:

- **`packages/domain/src/logic/progression.ts`** — `summarizeExerciseHistory()` groups a person's sets by workout for one exercise, computes per-session totals (volume, top weight, estimated one-rep-max), and returns them newest-first. `getPreviousPerformance()` is just the first (most recent) entry of that list, or `null`. Pure functions, no I/O.
- **`packages/domain/src/logic/loadProgression.ts`** — `suggestNextLoad()` takes the previous session's sets plus the exercise's *current* target rep range and target RIR, and returns one of `increase` / `maintain` / `decrease`, a suggested weight (or `null` if there's no history), and a plain-English reason. Pure function, no I/O.
- **`apps/mobile/app/workout/active.tsx`** — the only consumer. `previous = previousPerformance(activeExerciseId)` (from `useWorkoutHistory`, which wraps the two functions above) feeds `loadSuggestion = suggestNextLoad({...})`, rendered as the suggestion row; `handleApplySuggestion` stores the suggested weight in local component state (`appliedSuggestion`), which is then read back in as the `initialWeight` override for the next unlogged set's `SetRow`.

**Trace confirmed end to end, UI → domain logic → data source**: `SetRow.initialWeight` ← `appliedSuggestion` / `suggestionOverride` ← `handleApplySuggestion` ← `loadSuggestion` ← `suggestNextLoad()` ← `previous.sets` ← `previousPerformance()` ← `getPreviousPerformance()` ← `useWorkoutHistory()`'s `workouts`/`sets`, which come from the real, RLS-scoped `workouts`/`workout_sets` tables via the normal repository layer. This is not a stub, mock, or half-built path — it is a complete, working feature.

## DATA USED

- The exercise's **target rep range and target RIR** as configured *right now* on the active session's copy of that exercise (itself a snapshot taken when the workout was started — see `buildSessionExercises` in `lib/startWorkout.ts`).
- The **single most recent finished workout** containing at least one set of this exercise, and only that workout's sets — confirmed deliberate, not an oversight, by a dedicated test (`progression pipeline: getPreviousPerformance → suggestNextLoad`) that specifically asserts an older, heavier session is ignored in favour of the latest one, even when the latest one is lighter.
- Nothing else. No multi-session trend, no streak count, no deload/plateau detection, no awareness of how long ago the previous session was (a session from yesterday and one from six months ago are treated identically).

## UNUSED / DEAD CODE

**None found.** Every exported function in `packages/domain/src/logic/` was checked against actual call sites in `apps/mobile`; everything is reachable from a real screen. This capability is fully live, not an abandoned or half-integrated feature — a materially different conclusion than "maybe it's dead code," which was a real possibility going in given no discovery pass had previously investigated it.

## UNKNOWN / AMBIGUOUS BEHAVIOUR

- **What happens if the target rep range changes between sessions?** `suggestNextLoad` compares last session's performance against *today's* target, not the target that was actually in force when that performance happened. A person who raised their rep-range target after a great session could see a confusing "increase" suggestion evaluated against a goalpost that didn't exist yet when they earned it. Not confirmed as a bug — no test covers this case either way — genuinely unknown intended behaviour.
- **RIR 4+ is treated identically to RIR 2**, by the code's own admission (a `KNOWN GAP` comment in the test file, not something this audit discovered independently) — the function doesn't reward "that was easy" with a bigger jump. Confirmed deliberate simplification, not a bug, but worth product awareness.
- **The suggestion is purely ephemeral** — confirmed by another explicit `KNOWN GAP` comment in the test file: nothing is written back to the programme's stored target, so the *next* time this exercise's history is examined (e.g. a week later), the "previous session" used for a fresh suggestion is whatever was actually logged, not what was suggested. This is consistent and correct, just worth stating plainly: **there is no persisted "programme progression" — only a live, recomputed-every-time suggestion.**

## RISKS

**1. A genuine, previously-undetected interaction bug with this engagement's own earlier weight-stepper fix.** `suggestNextLoad`'s default increment is 2.5 kg, and its result is rounded to the nearest 0.5 kg (`roundToHalf`) — confirmed by the function's own tests producing values like 62.5, 77.5, and 57.5. But the weight-recording control fixed earlier in this project (`components/SetRow.tsx`) now moves in **fixed whole-kilogram steps only**. Applying a suggestion today would set a set's starting weight to a fractional value (e.g. 82.5 kg) that the stepper itself can never produce by its own +/- action, and every subsequent tap would preserve that fraction (83.5, 84.5, …) rather than snapping to a whole number. This is a real, concrete inconsistency between two pieces of work done at different times in this same engagement, not a hypothetical — it should be resolved (most likely by rounding a suggestion to the nearest whole kilogram before it's ever offered, rather than changing the stepper) as part of whatever stage next touches either piece, not left to be discovered by a confused user.

**2. Unvalidated historical input can silently corrupt a suggestion.** The reps/RIR validation gap documented throughout this engagement's prior audits (any text is currently accepted, with no check it's a sensible number) means a previous session's stored sets could already contain a value the suggestion logic wasn't written to expect. `suggestNextLoad` doesn't defend against this — a non-numeric or `NaN` value reaching it would propagate through `lastWeight + incrementKg` and surface as a literal "Suggested: NaN kg" in the UI. This is not a new problem this audit created; it's an existing, known gap (already scheduled for Stage 5 of `CORE_IMPLEMENTATION_PLAN.md`) whose blast radius turns out to be larger than previously documented — it doesn't just affect the set being logged, it can affect a *different* future session's suggestion too.

**3. Does authentication change affect this logic?** No, and this is worth stating with confidence rather than leaving as an open question: the logic only ever consumes `workouts`/`workout_sets`, already correctly RLS-scoped to whoever is authenticated. Nothing about the proposed logged-out/demo/authenticated model changes how or whether this feature works for a real authenticated person.

**4. Does it affect the core workout model or the proposed foundational work?** Indirectly, in one specific way: `PRODUCT_FOUNDATION.md`'s concrete definition of what Demo should contain (a reused built-in programme, a handful of fabricated workouts, one personal record) did not consider whether Demo should *also* demonstrate this suggestion feature. Given it's a real, working, differentiating capability, deliberately excluding it from a walkthrough meant to show "what PrimeForm looks like" would undersell the product it's supposed to demonstrate — see the recommendation below.

## RECOMMENDATION

- **Fixed.** On product review, the direction of reconciliation was decided the other way from this document's original suggestion: rather than rounding progression's suggestions down to whole kilograms, the weight control (`components/SetRow.tsx`) now moves in half-kilogram steps, so it can represent every value `suggestNextLoad`'s `roundToHalf` can produce. This keeps the progression engine's own precision intact (a coach's real "add 2.5kg" instinct isn't quietly flattened) rather than throwing away information to match the control. See `IMPLEMENTATION_REPORT.md` for the specific change and its tests.
- **Update `PRODUCT_FOUNDATION.md`'s Demo content list** to include at least one exercise where the fabricated history is deliberately shaped to trigger a visible "Suggested: increase" moment — this is cheap to arrange (since the history is fabricated anyway) and materially improves what Demo actually demonstrates about the product.
- **No change needed to `CORE_IMPLEMENTATION_PLAN.md`'s sequencing or the auth/state model work** — this logic is self-contained, correctly scoped by existing RLS, and unaffected by the proposed authentication changes. Proceed with that plan as designed.
- **The rep-range-changed-between-sessions ambiguity** (Unknown/Ambiguous, above) is real but low-frequency and low-severity (a slightly-too-generous or slightly-too-cautious suggestion once, self-correcting the next session) — record it as a known limitation rather than a blocker for anything in the current plan.
