# PrimeForm — BDD Specification Review

A critical second pass over `BDD_DISCOVERY.md`, `BDD_SPECIFICATION.md`, `TEST_AUTOMATION_STRATEGY.md`, and all 11 feature files in `apps/mobile/e2e/features/`. Where a genuine quality problem was found, it has been **corrected directly in the Gherkin/documentation** (permitted by this review's scope). No application code and no automation/test implementation was touched.

---

## 1. Overall BDD Quality Assessment

The original specification was structurally sound (correct Feature/Rule/Scenario shape, no forbidden implementation vocabulary, appropriate use of a single Scenario Outline) but had three real classes of defect, all now fixed:

1. **A genuine terminology collision** ("session" meaning three different things across three files) and **a genuine terminology inconsistency** ("reps" vs "repetitions" for the same concept in different files).
2. **One vague, insufficiently concrete scenario** (session restoration) that didn't meet its own stated bar of concreteness.
3. **A meaningful set of implemented, user-visible behaviours that discovery missed the first time** — most importantly, resuming an in-progress workout, confirming before discarding one, reordering exercises within a day, seeing previous performance while logging a set, and personal-record recognition. All five are now specified, each backed by a direct code reference checked during this review (not assumed).

One capability — **progressive overload / next-workout suggestions** — was found referenced in the project's own prior E2E documentation (`apps/mobile/e2e/JOURNEY_INVENTORY.md`, journey #8: "Progressive overload suggestion — display and tap-to-apply") but was never investigated by the original discovery pass and is **not** added here, because adding a rule for it now, without re-running discovery specifically for it, would risk exactly the invention this whole exercise is meant to avoid. It's recorded below as the highest-priority missing behaviour requiring its own discovery pass before it can be specified.

With those fixes applied, the specification now passes the "would a product owner, developer, and tester all agree what PrimeForm is supposed to do" test for every scenario it contains — see §5 for the specific scenarios that failed this test before being rewritten, and §6 for what's still deliberately absent.

---

## 2. Features Reviewed

All 11 reviewed line by line: `starting_primeform`, `data_privacy`, `programmes`, `programme_exercises`, `exercise_library`, `workouts`, `workout_sets`, `workout_history`, `progress`, `conditioning`, `profile`.

**Feature-structure findings:**
- No Feature was found to be describing a screen rather than a capability. `programme_exercises.feature` was the closest borderline case (it maps closely to one screen, "Configure Programme Exercise"), but its *content* is a coherent capability (setting and adjusting what a training day asks for), not a walkthrough of that screen — kept as-is, with one rule relocated out of it (see below).
- No two Features were found to represent the same capability.
- One Feature was found to contain a rule that belonged to a *different* capability than the one it was filed under: `programme_exercises.feature` had "A training day with no exercises cannot be started" — this is really about the *workout-starting* capability (its observable consequence is "no way to start it," which manifests where workouts are started, not where exercises are configured). **Moved to `workouts.feature`.**
- No Feature was found mixing genuinely unrelated business rules under one roof.

---

## 3. Rules Reviewed

43 Rules across the 11 features (up from 38 before this review — 5 net new rules added for missing behaviour, described in §6; 1 rule relocated between features, not double-counted).

Every Rule was checked against: *does this represent an actual product/business rule, not a technical grouping convenience?* One Rule was borderline — "Weight starts at a sensible default and changes only in whole-kilogram steps" could be read as describing a UI control rather than a rule. It survives review because the *fixed-increment* behaviour is a genuine, deliberate product decision (verified: it replaced a previously unvalidated free-text field specifically to remove a class of invalid data) — the rule is "weight moves in whole kilograms," which is a fact about training (plates come in discrete amounts), not an accident of the UI that implements it.

No Rule was found to exist purely to organise technical tests.

---

## 4. Scenarios Reviewed

44 concrete Scenarios plus 1 Scenario Outline (4 examples) — 48 executable examples in total, up from 39 + 4 = 43 before this review.

Every scenario was checked against all 12 questions in the request. Full detail on the ones that failed is in §5. Two points worth calling out explicitly since they're easy to get wrong in this exact domain:

- **"When I record 80 kg for 8 repetitions" is not a UI click sequence.** It describes a single meaningful business event (recording a set) at the same level of abstraction a person would describe it to another person. Whether that's automated as one gesture or a sequence of interactions is entirely an automation-layer concern (see `TEST_AUTOMATION_STRATEGY.md`) and rightly invisible here.
- **"Then only the first 80/120 characters are accepted" was checked carefully for being implementation-flavoured** (does "accepted" imply a text-input event model?). It survives because it describes an outcome a person can observe directly (what ends up in the name) without reference to any control, screen, or technology — it would remain equally true if PrimeForm's name field were a dial, a voice input, or a paper form with a strict character limit enforced by whoever's writing it down.

---

## 5. Scenarios Requiring Rewriting (found and corrected)

| # | File | Scenario | Problem found | Fix applied |
|---|---|---|---|---|
| 1 | `starting_primeform.feature` | Returning to PrimeForm | "I see my training data exactly as I left it" is abstract, not concrete — fails question 5 (is the example concrete?) and question 12 (would a product owner, developer, and tester agree what this means?) — "exactly as I left it" could mean anything | Rewritten around one concrete, named programme, matching the concreteness standard used everywhere else |
| 2 | `programme_exercises.feature` | Adding an exercise to a training day | Used "reps" where every other feature uses "repetitions" for the same concept — fails question 11 (consistent domain language) | Changed to "repetitions" |
| 3 | `programme_exercises.feature` | Adjusting the target repetitions for an exercise | Same terminology issue, plus the scenario title itself said "reps" | Renamed and reworded |
| 4 | `programme_exercises.feature` → `workouts.feature` | A day with no exercises cannot be started | Filed under the wrong capability (see §2); "When I look at 'Push'" was also too vague about *which* moment reveals the missing affordance | Relocated to `workouts.feature`; reworded to "When I consider starting 'Push'" |
| 5 | `workouts.feature` | Finishing a workout | "my workout history includes this session" collides "session" (a workout instance) with the unrelated, already-established meaning of "session" (a person's PrimeForm identity, used in `starting_primeform.feature` and `data_privacy.feature`) and with Conditioning/Mobility *Session* as a distinct domain entity — fails question 11 | Changed "this session" → "this workout" |
| 6 | `workouts.feature` | Discarding a workout | Same collision | Same fix |

All six are shown corrected in the current feature files; nothing above requires further action.

---

## 6. Missing Behaviours

Found by re-checking `CURRENT_STATE.md`'s screen-by-screen inventory and, for anything non-obvious, the actual source file, against what the original 11 feature files covered. Five were confirmed with a direct code reference and added; the rest are recorded here without being added, per the instruction not to invent a rule discovery hasn't actually established.

**Added to the specification this review (confirmed by code, listed with evidence):**

| Behaviour | Evidence | Where added |
|---|---|---|
| An in-progress workout can be resumed after leaving PrimeForm | `app/(tabs)/index.tsx`: a "Workout In Progress" resume affordance on Home | `workouts.feature` |
| Starting a new workout while one is in progress asks for confirmation | `lib/startWorkout.ts`'s `confirmAndStart`, which prompts before discarding an existing session | `workouts.feature` |
| Exercises within a training day can be reordered | `components/ReorderableRow.tsx` — "Move {exercise} up"/"down" | `programme_exercises.feature` |
| Previous performance is visible while recording a new set | `components/SetRow.tsx`'s `previousLabel` ("Last time: …") | `workout_sets.feature` |
| A new best result is recognised as a personal record | `calculateCurrentRecords`, used on the exercise detail, progress, and workout-summary screens | `progress.feature` |

**Identified, but deliberately *not* added — require a product decision or a dedicated discovery pass, not an assumption:**

| Behaviour | Why not added |
|---|---|
| **Progressive overload / next-workout weight-and-rep suggestions** | Referenced as a tested journey in the project's own prior documentation, but never discovered here — the actual rule (what triggers a suggestion, what it suggests, what "accepting" it does) is unknown. **Highest-priority follow-up discovery item.** |
| Adding or removing a training day from a programme | Genuinely implemented ("+ Add Day," "Remove day"), but the original discovery pass covered day-level exercises without separately confirming this. Should be folded into `programmes.feature` or `programme_exercises.feature` after a short confirming look, not guessed at here. |
| Programme category filtering (Full Body / Upper-Lower / Push-Pull-Legs / Hybrid) | A real UI affordance, but it's unclear whether filtering itself is a "rule" worth its own scenario or simply a convenience over the already-specified "browse and choose a programme" behaviour — a product call, not a specification gap. |
| Training streak as a distinct stat | Shown on Home, but whether it deserves its own rule (versus being an implementation detail of "progress") wasn't established either way. |
| Logging a body measurement or progress photo | Implemented (Progress → Physique), structurally identical in shape to conditioning/mobility logging, but not confirmed against its actual screen during this review — safer to confirm than assume it matches that pattern exactly. |
| Symmetric privacy scenario for custom exercises (not just programmes/workouts) | The privacy *rule* almost certainly holds (same RLS shape confirmed in `CURRENT_STATE.md`), but `data_privacy.feature` doesn't yet say so explicitly — a low-risk, low-priority addition for later rather than an urgent gap. |

**Confirmed absent from the application, and correctly absent from the BDD** (not a review defect — re-confirmed, not newly discovered):
- Editing or deleting a custom exercise once created.
- Editing or deleting a finished workout, a body measurement, or a progress photo.
- Any sign-out or session-ending capability.

---

## 7. Duplicate Behaviours

**No true duplicates found.** One pair of scenarios was checked closely for being the same behaviour twice:

- `starting_primeform.feature`'s "Returning to PrimeForm" (a programme persists across a restart) and `workout_history.feature`'s "Workout history survives returning to PrimeForm" (a finished workout persists across a restart).

**Verdict: not a duplicate.** These demonstrate the *same general rule* (a returning session sees its data intact) using two *different concrete domain objects*, in the two places that rule actually matters to a reader of each feature file. A reader of `workout_history.feature` shouldn't have to cross-reference `starting_primeform.feature` to trust that history specifically survives a restart — and removing either would leave a gap, not remove redundancy. This is the same reasoning that justifies the naming rules appearing in parallel form under both `programmes.feature` and `exercise_library.feature`.

---

## 8. Ambiguous Behaviours

Carried forward from `BDD_DISCOVERY.md`'s Unknown/Undecided list (re-verified as still open, not re-litigated) plus two behavioural details noticed specifically during this review:

1. Whether "no credentials, ever" is permanent product intent or a placeholder.
2. Whether a session should ever be transferable between devices.
3. Whether PrimeForm should always explain a rejected input, and how.
4. Whether repetitions/reps-in-reserve should get structural protection (like weight now has) or explicit validation instead.
5. Whether custom exercises should become editable/removable.
6. Whether Profile does or should influence recommendations/progression.
7. Whether the 80/120-character name limits are meaningful design decisions.
8. What should happen when a target rep range is entered backwards (currently silently corrected).
9. **(New this review)** Whether "starting a new workout discards the old one" should be reversible/recoverable in any way, or whether "Start New" is intentionally a one-way, no-recovery action.
10. **(New this review)** Whether personal records should be shown/celebrated at the moment they happen (e.g. during the workout) or only afterward in Progress — the code computes them, but where and when a person is *told* about a new record wasn't confirmed closely enough to specify.

---

## 9. Technical Tests Incorrectly Represented as BDD

**None found in the delivered feature files** — this was checked line by line against the request's own list (SQL injection, XSS/HTML/script payloads, database constraint testing, RLS-as-implementation-detail, API contract testing, performance testing, visual regression, Android-specific behaviour, browser compatibility, repository/unit-level tests). All of these were already correctly routed to `TEST_AUTOMATION_STRATEGY.md` in the prior pass and none had leaked into a `.feature` file.

One item was reviewed specifically for being *borderline* rather than clearly wrong, and is worth recording as a conscious decision rather than an oversight:

- **`data_privacy.feature`'s two scenarios** describe a genuine behavioural/security requirement in pure domain language (per the request's own worked example) and are correctly kept as BDD. What is *not* in them — and correctly so — is any mention of how that privacy is enforced (row-level security, an access-control list, anything else). If PrimeForm's backend were rewritten entirely, these two scenarios would still describe a true requirement.

---

## 10. Domain Terminology Issues

### Canonical glossary (recommended terms — see fixes applied in §5 for where these are now enforced)

| Concept | Canonical term | Do not use |
|---|---|---|
| The person's identity in PrimeForm | **Session** | "account," "login," "user" |
| A training plan | **Programme** | "plan," "routine" (neither appeared as a competing term in practice, but both are plausible drift — worth guarding against as the spec grows) |
| A named day within a Programme | **Training Day** | "day" alone when it could be ambiguous, "programme day" |
| A movement | **Exercise** | — (no drift found) |
| The planned sets/rep-range/effort/rest for an Exercise within a Training Day | **Target** | — (no drift found) |
| One occasion of performing a Training Day | **Workout** | "session" (reserved for the person's identity — see the fix in §5) |
| One completed unit of work within a Workout | **Set** | — (no drift found) |
| The count of repetitions performed or targeted | **Repetitions** | "reps" (found and fixed — see §5); "reps" remains acceptable only inside the fixed compound term "reps in reserve," which is its own concept, not a synonym |
| How many repetitions a person felt were left | **Reps in Reserve** (may be abbreviated **RIR** in the glossary only, never inside a scenario) | — |
| The amount of load used for a Set | **Weight** | — (no drift found) |
| The record of finished Workouts | **Workout History** | — (no drift found) |
| A summary of training trends over time | **Progress** | — (no drift found) |
| A logged cardio activity | **Conditioning Session** | generic "session" without qualification |
| A logged mobility activity | **Mobility Session** | generic "session" without qualification |
| A person's own recorded details | **Profile** | — (no drift found) |

### Issues found and resolved
- **"session" was overloaded three ways** (identity, a workout instance, a conditioning/mobility log) — fixed by reserving "session" exclusively for identity, and always qualifying the other two ("Conditioning Session," "Mobility Session" already did this correctly; "workout... session" in `workouts.feature` did not, and has been corrected to "workout").
- **"reps" vs "repetitions"** — fixed, see §5.
- **"plan" appeared once**, in `programme_exercises.feature`'s Feature description ("a specific plan for each exercise"), used as ordinary English rather than as a competing noun for "Programme" (it doesn't refer to a Programme at all — it refers colloquially to "what's planned"). Reviewed and left as-is; flagged here so it isn't mistaken for drift later if the glossary is checked mechanically (e.g. by a future automated terminology linter).

---

## 11. Traceability Matrix

Legend for **Status**: Covered / Covered-with-caveat (works, but has a known automation or feedback caveat) / Missing-minor / Missing-priority / Not-implemented (correctly excluded) / Ambiguous (documented, correctly excluded) / Technical (correctly excluded from BDD).

| Application capability | Current implementation | BDD feature | Covered? | Status |
|---|---|---|---|---|
| Anonymous session established on first use | `lib/supabase/auth.ts` | `starting_primeform.feature` | Yes | Covered |
| Session restored on relaunch | AsyncStorage-persisted session | `starting_primeform.feature` | Yes | Covered |
| Connection failure shows retry | `SessionGate` error state | `starting_primeform.feature` | Yes | Covered |
| Sign-out / ending a session | Does not exist | — | No | Ambiguous — see §8.1 |
| Choose a built-in programme | "Make this my programme" | `programmes.feature` | Yes | Covered |
| Create a custom programme | `/programs/new` | `programmes.feature` | Yes | Covered |
| Edit a custom programme's details | "Edit Details" | `programmes.feature` | Yes | Covered |
| Remove a custom programme | Delete affordance | `programmes.feature` | Yes | Covered-with-caveat (confirmation step's testability is inconsistent — see `CURRENT_STATE.md` §11) |
| Built-in programme cannot be changed/removed | No affordance offered + RLS | `programmes.feature` | Yes | Covered |
| Programme must have a name | Disabled create action | `programmes.feature` | Yes | Covered |
| Programme name capped at 80 characters | Field limit (fixed this audit) | `programmes.feature` | Yes | Covered |
| Filter programme library by category | Chip filters | — | No | Missing-minor (§6) |
| Add a training day to a programme | "+ Add Day" | — | No | Missing-priority-to-confirm (§6) |
| Remove a training day | "Remove day" | — | No | Missing-priority-to-confirm (§6) |
| Add exercise with a target to a day | Configure screen | `programme_exercises.feature` | Yes | Covered |
| Change an exercise's target | Configure screen | `programme_exercises.feature` | Yes | Covered |
| Remove an exercise from a day | Remove affordance | `programme_exercises.feature` | Yes | Covered |
| Reorder exercises within a day | `ReorderableRow` | `programme_exercises.feature` | Yes | Covered (added this review) |
| Day with no exercises can't be started | Disabled start affordance | `workouts.feature` | Yes | Covered (relocated this review) |
| Rep range entered backwards is silently corrected | `Math.max` in save handler | — | No | Ambiguous — see §8.8, correctly excluded |
| Search the exercise library | `/exercises` search | `exercise_library.feature` | Yes | Covered |
| No-match search shows a clear empty state | `EmptyState` | `exercise_library.feature` | Yes | Covered |
| Add a custom exercise | `/exercises/new` | `exercise_library.feature` | Yes | Covered |
| Exercise must have a name | Disabled save action | `exercise_library.feature` | Yes | Covered |
| Exercise name capped at 120 characters | Field limit (fixed this audit) | `exercise_library.feature` | Yes | Covered |
| Edit/delete a custom exercise | Not implemented | — | N/A | Not-implemented, correctly excluded |
| Start a workout from a training day | Start affordance | `workouts.feature` | Yes | Covered |
| Confirm before discarding an in-progress workout to start another | `confirmAndStart` | `workouts.feature` | Yes | Covered-with-caveat (added this review; shares the same confirmation-dialog testability caveat noted above) |
| Resume an in-progress workout after leaving | "Workout In Progress" card | `workouts.feature` | Yes | Covered (added this review) |
| Finish a workout, recording it | `finishSession` | `workouts.feature`, `workout_history.feature` | Yes | Covered |
| Discard a workout, not recording it | `discardSession` | `workouts.feature`, `workout_history.feature` | Yes | Covered |
| Record a completed set (weight + reps) | `SetRow` | `workout_sets.feature` | Yes | Covered |
| A set needs repetitions to complete | `canComplete` check | `workout_sets.feature` | Yes | Covered |
| Weight defaults sensibly, moves in 1 kg steps, floors at 0 | Weight stepper (fixed this audit) | `workout_sets.feature` | Yes | Covered |
| Optional reps-in-reserve | RIR field | `workout_sets.feature` | Yes | Covered |
| Undo/remove a set before finishing | `onUncomplete`/`onRemove` | `workout_sets.feature` | Yes | Covered |
| See previous performance while logging | `previousLabel` | `workout_sets.feature` | Yes | Covered (added this review) |
| Repetitions/RIR accept invalid text | No validation | — | No | Ambiguous — see `BDD_SPECIFICATION.md` gaps table, correctly excluded |
| Progressive overload / next-workout suggestion | `packages/domain/.../loadProgression.ts` (existence only, not investigated) | — | No | **Missing-priority** — see §6 |
| View workout history | Workouts/Progress tabs | `workout_history.feature` | Yes | Covered |
| History persists across restarts | Real backend storage | `workout_history.feature` | Yes | Covered |
| Progress reflects only finished training | Domain calculations | `progress.feature` | Yes | Covered |
| Personal record recognition | `calculateCurrentRecords` | `progress.feature` | Yes | Covered (added this review) |
| Training streak stat | Home metric | — | No | Missing-minor (§6) |
| Log a cardio session | `/workouts/log-cardio` | `conditioning.feature` | Yes | Covered |
| Log a mobility session | `/workouts/log-mobility` | `conditioning.feature` | Yes | Covered |
| Log a body measurement / progress photo | Progress → Physique | — | No | Missing-minor-to-confirm (§6) |
| Edit/update Profile fields | `/profile` | `profile.feature` | Yes | Covered |
| Age bounded 13–120 | DB constraint | `profile.feature` | Yes | Covered |
| Age rejection gives no visible reason | Silent failure | `profile.feature` (outcome only, no explanation claimed) | Yes | Covered-with-caveat, deliberately incomplete — matches actual behaviour |
| Programmes private to a session | RLS | `data_privacy.feature` | Yes | Covered-with-caveat (never automated against two real identities) |
| Workout history private to a session | RLS | `data_privacy.feature` | Yes | Covered-with-caveat (same) |
| Custom exercises private to a session | RLS | — | No | Missing-minor (§6) |
| Anonymous (no-session) read access to built-in catalogue | RLS `anon` policy | — | — | Technical — correctly excluded, belongs in security/API layer |
| Android system-navigation-bar overlap | Unverifiable by this project's tools | — | — | Technical — correctly excluded |
| Security payload handling (SQL/HTML/script/etc.) | E2E fuzzing suite | — | — | Technical — correctly excluded |
| Malformed numeric input fuzzing | E2E fuzzing suite | — | — | Technical — correctly excluded |

---

## 12. Recommended Changes

1. **Done in this review**: all six scenario rewrites (§5), all five confirmed-missing-behaviour additions (§6), the full terminology cleanup (§10).
2. **Before automation begins**, run a short, dedicated discovery pass specifically on progressive-overload/next-workout suggestions — this is the single largest confirmed gap, and it's a core enough capability (the project's own prior documentation calls it out by name) that automating everything else first and leaving it out risks the specification looking more complete than it is.
3. **Before automation begins**, spend the ~30 minutes needed to confirm the three "missing-minor-to-confirm" items in §6 (add/remove training day, body-measurement/photo logging, programme category filtering) rather than guessing their shape — each is small enough that a quick confirming look is cheap insurance against inventing the wrong rule.
4. **When automation begins**, treat every "Covered-with-caveat" row in §11 as a note to the automation layer, not the specification — e.g. the two `data_privacy.feature` scenarios need real, separate sessions to automate meaningfully (already captured in `TEST_AUTOMATION_STRATEGY.md`), and the confirmation-dialog scenarios (removing a programme, starting a new workout over an old one) may need a different automation approach per platform given the known dialog-testability caveat.
5. **Adopt the §10 glossary as the enforced vocabulary** going forward — in particular, reserve "session" exclusively for a person's PrimeForm identity in any future scenario, and always write "repetitions" in full.

---

## Final Counts

| Metric | Count |
|---|---|
| Features | 11 |
| Rules | 43 |
| Scenarios (concrete) | 44 |
| Scenario Outlines | 1 (4 examples) |
| Scenarios requiring rewriting (found and fixed) | 6 |
| Missing behaviours identified | 10 (5 added this review with direct code evidence; 5 recorded but deliberately not added, pending confirmation or dedicated discovery) |
| Unresolved product decisions | 10 (8 carried from `BDD_DISCOVERY.md`, 2 newly identified this review) |
| Scenarios moved out of BDD for being technical tests | 0 (none had been incorrectly included; the review confirmed the existing separation in `TEST_AUTOMATION_STRATEGY.md` was already correct) |
