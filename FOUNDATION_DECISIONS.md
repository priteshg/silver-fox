# PrimeForm — Foundation Decisions

This document exists because two parts of the prior foundation review were reconsidered rather than simply confirmed, plus one architectural correction was surfaced during that reconsideration. Only decisions with a genuine choice are listed — nothing here restates something already settled beyond dispute in `PRODUCT_FOUNDATION.md` or `AUTH_AND_STATE_MODEL.md`.

---

## Decision 1: Demo → real account should copy the programme's structure, not force an empty start

**DECISION**: Reversed from the prior recommendation. When someone creates an account from within Demo, offer "Use this programme" (clones the demo's built-in programme — its days and exercise targets — into a new, real, owned programme) or "Start fresh" (today's existing empty state). This is the flow proposed, and it's correct.

**WHY**: The prior recommendation ("always start empty") was based on an assumption that copying "demo data" meant copying *everything* — including fabricated workout history and personal records — which would genuinely be dishonest (a real account showing workouts that never happened). But a **programme is a plan, not a record**. Copying a plan a person liked into their own account doesn't misrepresent anything; copying a fabricated *history of having performed it* would. Once that distinction is drawn precisely, the objection to copying disappears for the programme specifically, and the original "start empty" recommendation was stricter than it needed to be.

Technically, this is a small addition, not a new capability: creating a custom programme from a template is the same database operation as creating one from a blank form (`programRepository.ts`'s existing `createProgram` insert shape — same `programs`/`program_sessions`/`program_exercises` rows, just pre-filled from the built-in programme's existing detail rather than from form input). The exercises referenced (`program_exercises.exercise_id`) don't need copying at all — they already point at the same shared, public, built-in exercise rows. No new table, no new RLS policy: the source data (a built-in, non-owned programme) is already public, and the write target (a new row owned by the new `auth.uid()`) already matches the existing insert policy shape exactly.

**ALTERNATIVES CONSIDERED**:
- *Always start empty* (the prior recommendation) — simplest, but needlessly punishes exactly the person the demo just worked on.
- *Copy everything, including fabricated history* — rejected outright: this would mean a real account contains workouts that never happened, which is a data-integrity and honesty problem, not a convenience.
- *Offer to copy, but only the programme name/shape without specific exercise targets* — considered and rejected as a false economy; there's no meaningful complexity saved by stripping the targets, and doing so would hand the new user a plan that's actually less useful than the one they saw.

**TRADE-OFFS**: One extra decision screen in the sign-up flow ("Use this programme" / "Start fresh"), which is a small, real increase in onboarding friction, in exchange for avoiding a needless empty state for someone who was already sold on a specific plan.

**DECISION REQUIRED FROM PRODUCT OWNER**: None — this is now settled. The one open detail worth a product owner's eventual opinion (not blocking any implementation) is whether "clone a built-in programme into your own editable copy" should also be offered as an ordinary feature to already-authenticated people, independent of Demo — it falls out naturally from this work but wasn't asked for and shouldn't be built speculatively now.

---

## Decision 2: Defer the exercise-metadata changes (`is_compound`, `is_unilateral`, constrained `movement_pattern`) — do not build them this milestone

**DECISION**: Reversed from the prior recommendation. None of the three proposed metadata changes should be built in this milestone. `exercise_substitutions` and the existing fields (muscle groups, equipment, difficulty) are sufficient foundation to leave in place until substitution is actually being designed.

**WHY**: Two things changed my analysis from the prior pass. First, this round's instruction was explicit: *"I want the minimum domain model necessary, not speculative schema."* Without a concrete substitution-matching algorithm designed, adding `is_compound`/`is_unilateral` now means guessing at the fields such an algorithm will actually want — and guessing wrong costs more than waiting, because `movement_pattern`'s conversion to a constrained set requires a real data-audit migration (re-categorising every existing exercise), and doing that migration once, when the actual required granularity is known, is cheaper than doing it now with guessed values and again later when substitution design reveals the guess was wrong (e.g. discovering "push" needed to be "horizontal push" vs "vertical push" all along).

Second, I checked (rather than assumed) whether `movement_pattern` is used for anything today: it is purely a display label on the exercise detail screen (`app/(tabs)/exercises/[exerciseId].tsx`) — not used for search, filtering, or any matching logic. There is no current functional pressure to structure it; the only justification would be future substitution, which isn't being built. That confirms the change would be entirely speculative right now.

One incidental finding worth recording: some existing seed data already encodes unilateral/bilateral information *inside* the free-text `movement_pattern` value today (e.g. "Unilateral Squat" alongside "Knee-Dominant Squat"). This is useful evidence for later — it means a future migration may be able to partially derive `is_unilateral` from existing text rather than starting from nothing — but it doesn't change the recommendation to wait.

**ALTERNATIVES CONSIDERED**:
- *Build all three now* (the prior recommendation) — technically cheap in isolation, but risks being the wrong shape once real substitution design happens, and commits to a data-migration effort before there's a consumer for its output.
- *Build only the two booleans, defer the movement-pattern conversion* — rejected: the booleans in isolation don't unblock anything either, since no substitution logic exists yet to consume them, and it would leave the schema in a half-migrated, still-not-really-useful state.
- *Defer all three* (this decision) — correct given no substitution design exists yet to validate the shape against.

**TRADE-OFFS**: Substitution design, whenever it happens, will need to start with a short metadata-design step of its own rather than finding the ground already prepared. This is the right trade — a short delay at the point the work is actually needed, instead of speculative schema sitting unused (and possibly wrong) until then.

**DECISION REQUIRED FROM PRODUCT OWNER**: None for this milestone. When substitution is actually scheduled, its own kickoff should include a short metadata-design pass (informed by the actual matching approach chosen) before any migration is written.

---

## Decision 3: Correct the client-state model — separate Supabase authentication state from client application state

This wasn't a product decision so much as an architectural correction the review surfaced, but it changes `CORE_IMPLEMENTATION_PLAN.md` Stage 2's design, so it's recorded here rather than silently fixed.

**DECISION**: The prior review's single `AuthState = logged_out | demo | authenticated` union conflated two genuinely different things. The corrected model uses two separate, independently-reasoned layers:

- **Supabase Authentication State** (backend-verifiable, from `supabase.auth.getSession()` / `onAuthStateChange`): only ever `no_session` or `authenticated`. This is the only state RLS, `auth.uid()`, and the database care about — and it should stay that way.
- **Client View Mode** (a purely local, on-device concept): `logged_out`, `demo`, or `app`. `app` can only be reached when Supabase's state is `authenticated`; `logged_out` and `demo` are both simply presentations chosen *while* Supabase's state is `no_session` — Demo is not a backend state, an account type, or anything Supabase or RLS ever needs to know exists. It is nothing more than a local flag meaning "show the walkthrough content instead of the empty landing screen."

**WHY**: Treating Demo as a peer of "logged out" and "authenticated" in one flat enum implies, incorrectly, that it's a backend-recognisable condition — which risks exactly the kind of accidental complexity (a demo flag creeping into a Supabase call, a demo-aware RLS policy someone adds "just in case") that `AUTH_AND_STATE_MODEL.md` already argued against. Naming the two layers separately makes the correct rule impossible to get wrong by accident: **nothing about Demo is ever sent to Supabase**, because Demo isn't a state Supabase's layer has any vocabulary for in the first place.

This also resolves a related requirement precisely: **session expiry** should be handled by listening for Supabase's own `onAuthStateChange` event transitioning `authenticated → no_session` (e.g. a refresh failure), and reacting by setting Client View Mode to `logged_out` — not `demo`. A person whose session silently expired should land on the plain "what PrimeForm does" screen, not accidentally re-enter the walkthrough.

One further consequence worth naming: `app.json`'s `scheme: "silverfox"` (already present, currently unused by any code) becomes genuinely necessary once password reset is in scope, since Supabase's reset-password email needs a deep link back into the app to land the person on a "set new password" screen. This is a small, real, previously-invisible piece of implementation cost.

**ALTERNATIVES CONSIDERED**:
- *Keep the single flat three-value union* — simpler to write, but actively invites the conflation this correction exists to prevent.
- *Model Demo as a special, unauthenticated Supabase session type* — rejected; Supabase's anonymous auth already offers something like this, and reaching for it here would silently reintroduce exactly the anonymous-identity pattern `AUTH_AND_STATE_MODEL.md` argued to remove.

**TRADE-OFFS**: Two pieces of state to reason about instead of one, but each is simpler on its own, and the separation is what makes "Demo never touches Supabase" a structural guarantee rather than a discipline someone has to remember.

**DECISION REQUIRED FROM PRODUCT OWNER**: None — this is a technical correction, not a product trade-off.

---

## Decision 4: Defer password reset to the milestone after this one

**DECISION**: Revised from the prior pass's "recommend yes." Password reset is now recommended as **out of scope for this milestone**, to be picked up immediately after.

**WHY**: Two things changed this from the earlier recommendation. First, Decision 3 surfaced that password reset isn't just "a small, well-understood Supabase feature" as previously characterised — it requires wiring up a deep-link route through `app.json`'s currently-unused `scheme`, which is a genuine (if small) piece of new plumbing, not a checkbox in the Supabase dashboard alone. Second, every prior audit in this engagement (`CURRENT_STATE.md` onward) has confirmed this is a pre-launch product with no real account holders yet — there is no one today who could actually be locked out of a forgotten password, which was the entire justification for treating it as urgent. Shipping credentialed sign-up/sign-in without reset for a short, deliberate window is a reasonable, explicitly-chosen trade, not an oversight.

**ALTERNATIVES CONSIDERED**:
- *Include it in this milestone* (the prior recommendation) — defensible, but adds deep-link plumbing to an already substantial milestone for a need that doesn't exist yet.
- *Defer it indefinitely / decide never to build it* — rejected; a real product with real credentials will need this eventually, it's just not urgent today.

**TRADE-OFFS**: Anyone who forgets a password before the next milestone ships has no self-service recovery path. Given the current user base is this engagement's own test accounts, that risk is close to zero right now — but it should not be allowed to drift past the point where real people are actually signing up.

**DECISION REQUIRED FROM PRODUCT OWNER**: **Yes — explicit sign-off needed.** Confirm there's no near-term plan to open real sign-ups before the following milestone ships. If there is, password reset should move back into this milestone despite the added cost.

---

## Decision 5 (carried forward, unchanged): existing anonymous session data

**DECISION**: No migration path is being built for existing anonymous-session data; it's treated as a low-cost, pre-launch reset.

**WHY**: Unchanged from the prior review — every anonymous account created during this engagement's own testing is test data, not real user data.

**DECISION REQUIRED FROM PRODUCT OWNER**: Confirm there is no real data behind any existing anonymous session in the connected Supabase project before Stage 2 of `CORE_IMPLEMENTATION_PLAN.md` ships. If this assumption is wrong, a one-off linking script is needed *before* that stage, not a permanent feature.

---

## Ready to implement

Sufficiently defined, with no further product input needed, to move straight to implementation planning at the detail level:

- Removing automatic anonymous sign-in from app launch; the two-layer Supabase-state/Client-view-mode model from Decision 3.
- Real email/password sign-up, sign-in, sign-out (Stage 1/2 of `CORE_IMPLEMENTATION_PLAN.md`), **without** password reset (Decision 4).
- The local, non-persistent, **read-only** Demo experience (confirmed read-only, not editable, by this round's clarification) built from the existing built-in catalogue plus fabricated history/profile, per the concrete content list in `PRODUCT_FOUNDATION.md` — now additionally including at least one exercise whose fabricated history triggers a visible progression suggestion (per `PROGRESSION_LOGIC_AUDIT.md`'s recommendation).
- "Use this programme" / "Start fresh" at account creation (Decision 1), implemented as a small extension of the existing create-programme insert path.
- Reps/RIR validation brought up to the weight field's standard, and the rep-range-backwards behaviour changed to reject-with-explanation (Stage 5, unchanged).
- The one-line fix to round a suggested weight to the nearest whole kilogram before it's ever offered (`PROGRESSION_LOGIC_AUDIT.md`, Risk 1), folded into Stage 5.
- BDD respecification of `starting_primeform.feature`, a new `demo_experience.feature`, and confirmation that `data_privacy.feature` is now genuinely automatable with two real accounts (Stage 7, unchanged).

## Still unresolved

- **Password reset timing** — needs explicit product-owner sign-off (Decision 4), not a technical unknown.
- **Existing anonymous test data** — needs confirmation there's nothing real behind it (Decision 5).
- **Stage 0's own findings** (`PROGRESSION_LOGIC_AUDIT.md` is Stage 0's output, now complete) confirmed the progression-suggestion feature needs no auth-related changes and no plan resequencing — this line item is now resolved, not outstanding, and is removed from future "unresolved" tracking.
- **The rep-range-entered-backwards behaviour change** (reject instead of silently correct) remains flagged in `PRODUCT_FOUNDATION.md` as a product call worth explicit confirmation before Stage 5 starts, not purely a technical fix.
- **Whether "clone a built-in programme" should become a general, non-demo-specific feature** — noted in Decision 1 as a natural follow-on, not something to decide now.

## Recommended implementation order

Unchanged in shape from `CORE_IMPLEMENTATION_PLAN.md`, with Stage 0 now complete and Decisions 1–4 folded into the stages that already existed for them:

1. ~~Stage 0 — investigate progression logic~~ **(done — see `PROGRESSION_LOGIC_AUDIT.md`)**
2. Stage 1 — real auth built alongside the existing flow, without password reset (Decision 4), without yet changing app launch.
3. Stage 2 — introduce the two-layer Supabase-state/Client-view-mode model (Decision 3) and switch the launch path; remove automatic anonymous sign-in.
4. Stage 3 — build the local, read-only Demo experience, including a progression-suggestion moment (per the audit's recommendation).
5. Stage 4 — Demo → account creation, now including "Use this programme" / "Start fresh" (Decision 1).
6. Stage 5 — reps/RIR validation, systemic error-handling, rep-range-backwards rejection, and the progression-suggestion rounding fix, all bundled as one validation-hardening stage.
7. Stage 6 — **removed from the near-term plan** (Decision 2) — exercise metadata work waits until substitution is actually scheduled.
8. Stage 7 (renumbered from 7, unchanged in content) — BDD respecification.

Each stage still leaves PrimeForm in a usable, demoable state at its end, exactly as `CORE_IMPLEMENTATION_PLAN.md` originally required.
