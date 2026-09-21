# Silverfox — Core Implementation Plan

Nothing in this document has been built. Each stage is scoped to leave the application genuinely usable and demoable at the end of it — no stage depends on a later one to avoid being broken. Stages are ordered by dependency, not by size: state-model work comes first because almost everything else (a trustworthy Demo, meaningfully-automatable privacy tests, a real BDD respecification) depends on it existing.

---

## Stage 0 — Understand before building: the undocumented progression logic — **DONE**

Completed; findings are in `PROGRESSION_LOGIC_AUDIT.md`. Summary: the progression-suggestion feature is fully live (not dead code), self-contained, and unaffected by the proposed auth/state changes. It does, however, share a real, previously-undetected interaction bug with this engagement's own earlier weight-stepper fix — a suggested weight can be fractional (e.g. 82.5 kg) while the weight control now only moves in whole-kilogram steps. This is folded into Stage 5, below, rather than treated as a separate stage.

---

## Stage 1 — Real authentication, built alongside the existing flow (not yet the default) — **DONE**

Implemented together with Stage 2 below in a single delivery (splitting them into two separate merges added no real safety once the existing-data verification was complete) — see `IMPLEMENTATION_REPORT.md` for full detail: what changed, files touched, tests added, verification performed, and issues/decisions raised. Work stopped here per the agreed stop condition; Stage 3 onward has not started.

**Objective**: give Silverfox real sign-up/sign-in/sign-out, without yet changing what happens on app launch. This deliberately decouples "build real auth" from "switch the app over to it," so the riskiest change (altering the launch path everyone currently goes through) happens in its own later stage, with a fallback available if something's wrong.

- **Database changes**: none required — Supabase Auth's email/password support needs no schema change; the existing `handle_new_auth_user` trigger already provisions a `profiles` row for any new `auth.users` row, real or anonymous.
- **Application changes**: new `lib/supabase/auth.ts` functions — `signUpWithEmail`, `signInWithEmail`, `signOut` — sitting alongside (not replacing) `ensureSession`/`signInAnonymously` for now. Password reset is explicitly **out of scope for this milestone** (`FOUNDATION_DECISIONS.md`, Decision 4) — no `requestPasswordReset` function, no deep-link wiring for it.
- **Authentication changes**: this stage's entire purpose. Session persistence, refresh, and storage are unchanged (already correctly configured in `lib/supabase/client.ts`).
- **UI changes**: new sign-up/sign-in screens, reachable only via a direct route for internal testing at this stage (not yet linked from the app's normal launch flow). No forgot-password screen this milestone.
- **BDD scenarios affected**: a rewritten `starting_silverfox.feature` gets drafted here (see Stage 7) but not yet treated as the description of default behaviour, since default behaviour hasn't changed yet.
- **Automated tests required**: unit tests for the new auth functions against a fake Supabase client (matching the existing pattern in `apps/mobile/lib/repositories/__tests__/*`); a manual/exploratory pass through sign-up → sign-in → sign-out → sign-in again.
- **Risks**: low — nothing existing is touched; the new screens are additive and unreachable by normal use until Stage 2.
- **Acceptance criteria**: a person can create a real account by email/password, sign out, and sign back in, with their data intact, via the new (currently hidden) screens.

---

## Stage 2 — Introduce the two-layer state model and switch the launch path — **DONE** (see Stage 1)

**Objective**: replace automatic anonymous sign-in with the real state model. This is the stage that actually changes default behaviour, and the one most worth treating carefully.

- **Database changes**: none.
- **Application changes**: introduce two separate, explicit pieces of client state, per the correction in `FOUNDATION_DECISIONS.md` Decision 3 — a Supabase Authentication State (`no_session | authenticated`, derived from `supabase.auth.getSession()` and kept in sync via `onAuthStateChange`) and a Client View Mode (`logged_out | demo | app`, purely local, with `app` reachable only when the auth state is `authenticated`). This replaces `SessionGate`'s current binary "ready or not" model. `ensureSession()`'s automatic `signInAnonymously()` call is removed from the launch path entirely (the function itself doesn't need deleting — it's just no longer called at startup). `onAuthStateChange` transitioning `authenticated → no_session` (an expired/revoked session) sets Client View Mode to `logged_out`, never `demo`.
- **Authentication changes**: on launch, check for an existing **real** (non-anonymous) persisted session only. If present → auth state `authenticated`, view mode `app`. If absent → auth state `no_session`, view mode `logged_out` (not an automatic anonymous sign-in).
- **UI changes**: a new Logged Out screen (the "what Silverfox does" explanation + "See a demo" / "Create account" / "Sign in" — now wiring up Stage 1's screens for real) becomes what a fresh install actually sees.
- **BDD scenarios affected**: `starting_silverfox.feature` is rewritten for real (see Stage 7) — this is the stage where its new content becomes true.
- **Automated tests required**: an E2E scenario confirming a fresh install reaches Logged Out, not an automatically-created account; a regression check that an *existing* authenticated session still restores correctly (Stage 1's accounts, and manually-verified existing anonymous test accounts, should both be checked here — see Risks).
- **Risks**: **this is the stage with real risk**, for one specific reason — any existing anonymous session (from this project's own prior testing, or any real installs if this has shipped anywhere already) will no longer be recognised as "logged in" once anonymous auto-sign-in is removed from the launch path. That data isn't deleted (nothing here touches existing rows), but it becomes unreachable through the normal UI, since there'd be no credentials to sign back into it with. Given this project's current state (a pre-launch, test-data-only product, per every prior audit in this engagement), the recommended handling is: accept this as a one-time, low-cost reset, and confirm with whoever owns the Supabase project that there's no data there worth preserving before this stage ships. If that assumption is wrong, the correct fix is a one-off script to link known anonymous test accounts to placeholder credentials **before** this stage — not a permanent product feature.
- **Acceptance criteria**: a fresh install reaches Logged Out and never silently creates a backend identity; creating a real account or signing in reaches Authenticated exactly as Stage 1 already proved; nothing else in the app (programme/exercise/workout screens) changes behaviour once Authenticated, since the ownership model underneath was never touched.

---

## Stage 3 — Build the local Demo experience — **DONE**

Implemented: `lib/demo/demoData.ts` builds a realistic programme (Foundation 40+, read from the same local `data/programmeCatalogue.ts`/`data/seedExercises.ts` catalogue the app's own seed data uses — no network call, no path to Supabase at all), 6 fabricated completed workouts spanning ~2.5 weeks rotating Push/Pull/Legs, and a filled-in example profile. Bench Press's fabricated sets are specifically shaped so the real `suggestNextLoad` engine produces a genuine "increase" suggestion — Demo's Progress section shows an authentic computed result, not a second hand-written copy of one. `components/AuthFlow.tsx`'s `DemoScreen` renders all of this (programme, recent workouts, progress, profile) under the existing persistent "DEMO — example data, not saved" banner. See `IMPLEMENTATION_REPORT.md` for verification detail (confirmed via test and manual pass: Demo issues zero Supabase requests).

---

## Stage 3 (plan, kept for reference) — Build the local Demo experience

**Objective**: the walkthrough a Logged Out visitor can enter without creating any backend identity.

- **Database changes**: none. Demo reads the existing, already-public built-in catalogue (`programs`/`program_sessions`/`program_exercises`/`exercises` where `is_custom = false`) exactly as any anonymous request already can today — no new public data, no new policy.
- **Application changes**: a local, **read-only** data source (in-memory or local-only storage, never `AsyncStorage`-backed the same way real session data is, to avoid any risk of the two being confused in code) providing: a chosen built-in programme, a small set of fabricated finished-workout records against it (including at least one exercise whose fabricated history is shaped to trigger a visible progression suggestion, per `PROGRESSION_LOGIC_AUDIT.md`), and a fabricated profile — matching the concrete "what Demo needs to contain" list in `PRODUCT_FOUNDATION.md`. Demo is a walkthrough, not a sandbox — no local mutation logic is needed. The existing hook/repository pattern (`useProgramDetail`, `useWorkoutHistory`, etc.) should be able to take this local source as an alternate backing implementation, given they're already a thin layer over a repository call — this is the payoff of that pattern already existing, not new architecture.
- **Authentication changes**: none — Demo never calls Supabase Auth, and Supabase's own authentication state has no concept of Demo at all (it is purely a Client View Mode, per `FOUNDATION_DECISIONS.md` Decision 3).
- **UI changes**: a persistent, unmissable "Demo" indicator visible on every screen while in this mode; a "Create your own Silverfox" call to action, reachable from anywhere in Demo, leading to Stage 1/2's account-creation screen.
- **BDD scenarios affected**: a new `demo_experience.feature` (see Stage 7).
- **Automated tests required**: E2E coverage that Demo never issues a real network write; a scenario confirming the demo label is present on every screen reachable from it.
- **Risks**: the main risk is scope creep — it would be easy to start building demo-specific UI polish that isn't really about the state model. Keep the concrete content list from `PRODUCT_FOUNDATION.md` as the hard boundary.
- **Acceptance criteria**: a Logged Out visitor can enter Demo, see a realistic programme/history/progress/profile, and leave without anything having touched the real backend at any point (verifiable by watching network traffic during a manual pass).

---

## Stage 4 — Demo → Account creation transition, with "Use this programme" / "Start fresh" — **DONE**

Implemented: signup carries a `fromDemo` flag through `AuthProvider.signUp`; on immediate success (no email confirmation needed — see the known limitation below) it sets a new transient `pendingProgramChoice` state that keeps `AuthFlow` mounted for one more screen even though a real session now exists, specifically so the choice is reachable at all before the real app renders. "Use this programme" calls a new `cloneBuiltInProgram()` in `programRepository.ts` — reads the built-in programme's detail and re-inserts its days/exercise-targets under the new owner via the exact same row-shape mappers (`programToRow`/`dayToRow`/`programExerciseToRow`) ordinary custom-programme creation already uses, referencing the same shared `exercises` rows rather than copying them — then sets it as the active programme. "Start fresh" is a genuine no-op: a brand-new account with no explicit active programme already reaches today's existing empty state by default. Neither path touches `workouts`, `workout_sets`, or the profile. **Known, documented limitation**: if email confirmation is required, there is no session yet to act on when signup returns, so the choice is skipped and the person reaches an ordinary empty account after confirming and signing in separately — not silently broken, but not covered either; flagged for product input rather than guessed at.

**Objective** (original plan, kept for reference): close the loop from Demo to a real Authenticated state, per `FOUNDATION_DECISIONS.md` Decision 1 — offering to carry over the demo's *programme structure* (a plan, safe to copy) while never carrying over any fabricated *history* (a record, which would misrepresent something that never happened).

- **Database changes**: none — this reuses the existing `programs`/`program_sessions`/`program_exercises` insert shape already used by ordinary custom-programme creation; the cloned rows reference the same existing, shared, built-in `exercises` rows rather than copying them.
- **Application changes**: the "Create your own Silverfox" action from Stage 3 leads into Stage 1's real sign-up flow; on success, if the person arrived from Demo, present "Use this programme" / "Start fresh." "Use this programme" clones the demo's built-in programme's days and exercise targets into a new, real, owned programme (a small addition to `programRepository.ts` — read the built-in programme's existing detail, write it via the same insert logic `createProgram` already uses, for the new owner). "Start fresh" reaches today's existing empty "no programme selected" state. **Neither path ever copies workout history, personal records, or profile fields from Demo** — those remain fabricated, local, and left behind entirely.
- **Authentication changes**: none beyond what Stage 1 already built.
- **UI changes**: the "Use this programme" / "Start fresh" choice screen, shown only when arriving from Demo.
- **BDD scenarios affected**: `demo_experience.feature`'s final rule (see Stage 7) now describes both paths explicitly.
- **Automated tests required**: an E2E scenario proving "Use this programme" produces a real, owned copy of the programme's structure; a second proving neither path ever results in fabricated workout history, personal records, or profile data appearing in the new account.
- **Risks**: the main risk is scope drift — it would be easy to let "clone a programme" grow into a general-purpose feature (e.g. duplicating any programme, not just the demo's) during this stage. Keep it scoped to the demo-to-account transition only; a general clone feature is a natural follow-on, not part of this stage (`FOUNDATION_DECISIONS.md`, Decision 1).
- **Acceptance criteria**: "Use this programme" leaves the new account with a real, editable copy of the demo programme's structure and nothing else from Demo; "Start fresh" reaches a genuinely empty, correctly-owned Authenticated state.

---

## Stage 5 — Core workout model hardening: validation and error handling

**Objective**: bring repetitions and RIR up to the standard weight was already brought to, and close the systemic silent-failure gap identified repeatedly across `CURRENT_STATE.md`, the BDD work, and this review.

- **Database changes**: none — the existing `integer not null check (reps >= 0)` and `numeric check (rir between 0 and 10)` constraints are already correct; the gap is entirely client-side.
- **Application changes**: repetitions gets the same treatment weight already received (a bounded, structurally-valid control, or at minimum a validated numeric field with a clear inline message) rather than unchecked free text; RIR gets equivalent treatment for its 0–10 range. The programme-exercise rep-range-entered-backwards behaviour (silently corrected today) is changed to reject with an explanation, per the recommendation in `PRODUCT_FOUNDATION.md`. A shared pattern for surfacing a failed save (a visible, specific error message, not a silent no-op) is introduced and applied at minimum to programme creation/editing, exercise creation, and workout/set completion — the highest-traffic write paths. The weight control's step size was widened from 1kg to 0.5kg (implemented during Stage 1, ahead of this stage, since it was a small, self-contained fix) so it can represent every value `suggestNextLoad` can produce — closing the fractional-value interaction bug identified in `PROGRESSION_LOGIC_AUDIT.md` (Risk 1).
- **Authentication changes**: none.
- **UI changes**: as above — this is primarily a UI/validation stage.
- **BDD scenarios affected**: `workout_sets.feature` gains new, currently-absent rules once these become genuine (not hypothetical) product behaviour — e.g. "a set cannot be completed with an invalid number of repetitions" — which today cannot honestly be written (see `BDD_SPECIFICATION.md`'s Current Behaviour Gaps table) but can be, truthfully, once this stage ships. `programme_exercises.feature` gains a rule about rejecting a backwards rep range.
- **Automated tests required**: the E2E fuzzing that already exists for weight (`workout-logging.spec.ts`) extends naturally to reps/RIR once there's real behaviour to assert against; new BDD scenarios per above.
- **Risks**: changing "silently accepted" to "rejected with a message" for rep-range-backwards is a genuine behaviour change, not just a fix — flagged in `PRODUCT_FOUNDATION.md` as a product call, not a purely technical one, and worth explicit sign-off before this stage starts rather than discovering the disagreement after it ships.
- **Acceptance criteria**: reps and RIR cannot be saved as non-numeric or out-of-range values; the three highest-traffic write paths show a visible, specific error on failure instead of nothing.

---

## Stage 6 (formerly "exercise metadata for future substitution") — **removed from this plan**

Reversed per `FOUNDATION_DECISIONS.md` Decision 2: `is_compound`, `is_unilateral`, and the `movement_pattern` enum conversion are deferred until substitution itself is actually being designed, not built speculatively now. `movement_pattern` was confirmed (not assumed) to be used only for display today (`app/(tabs)/exercises/[exerciseId].tsx`) — there is no current consumer that would benefit from structuring it, so doing so now would be schema built for an algorithm that doesn't exist yet. This slot is intentionally left empty rather than renumbered away, so the gap is visible rather than silently smoothed over.

---

## Stage 7 — BDD respecification

**Objective**: bring `apps/mobile/e2e/features/` in line with the new state model, without turning it into a UI-implementation test suite.

- **Database changes**: none.
- **Application changes**: none (documentation-only stage, though it may trail slightly behind Stages 2–5 rather than strictly follow them, since writing a scenario for behaviour that doesn't exist yet is exactly what the prior BDD work was careful never to do).
- **Authentication changes**: none.
- **UI changes**: none.
- **BDD scenarios affected** (this stage's actual content):
  - `starting_silverfox.feature` rewritten: "a session is established automatically" is no longer true and must go; new rules cover reaching Logged Out on first use, creating an account, signing in, and signing out (a genuinely new rule — sign-out doesn't exist in the spec today because it didn't exist in the product).
  - A new `demo_experience.feature`: entering Demo, Demo being clearly identified, Demo not persisting, and the transition to a real account via either "Use this programme" (carrying over the programme's structure only) or "Start fresh" (empty) — never carrying over fabricated history, records, or profile data either way.
  - `data_privacy.feature`'s existing two scenarios are kept as-is (they were already correct, domain-language descriptions of a real requirement) but their automation notes in `TEST_AUTOMATION_STRATEGY.md` are updated to reflect that two real accounts, not two anonymous ones, are now the natural way to prove them.
  - Every other existing feature file (`programmes`, `programme_exercises`, `exercise_library`, `workouts`, `workout_sets`, `workout_history`, `progress`, `conditioning`, `profile`) is reviewed for an implicit assumption that should become explicit: every scenario in these files assumes "as an authenticated person with my own data," which was previously true by default (everyone was anonymously "logged in") and now needs to be a stated precondition rather than an accident of there being no other state.
- **Automated tests required**: none new beyond what Stages 2–5 already required — this stage is about correctness and completeness of the specification itself.
- **Risks**: low — this is the same kind of work as the recent BDD review, applied to new content.
- **Acceptance criteria**: every feature file accurately describes the product as it exists after Stages 2–5; nothing in the spec describes behaviour the product doesn't yet have, or omits behaviour it now does.

---

## Deferred (named for completeness, not scheduled)

Substitution matching/reasoning, all exercise metadata for substitution (`FOUNDATION_DECISIONS.md`, Decision 2), password reset (`FOUNDATION_DECISIONS.md`, Decision 4 — deferred to the following milestone, not indefinitely), stability/loading-characteristic exercise metadata, and social/AI/nutrition/gamification/wearables features — all per `PRODUCT_FOUNDATION.md`'s explicit scope boundary. Progression suggestions themselves are not deferred — Stage 0 confirmed the feature is live and working; only its one identified bug (Stage 5) and its inclusion in Demo (Stage 3) are in scope.
