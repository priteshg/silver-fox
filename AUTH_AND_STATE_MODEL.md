# PrimeForm — Authentication and User State Model

This is the document with the explicit recommendation the brief asked for on the anonymous-session question. Short version up front: **the current anonymous-Supabase-session architecture should not simply be retained and wrapped in a new label — it should stop being the default entry point.** The reasoning follows.

---

## CURRENT STATE

From `lib/supabase/auth.ts` and `lib/supabase/client.ts`:

- `SessionGate` (`app/_layout.tsx`) calls `ensureSession()` unconditionally, before anything else renders.
- `ensureSession()` checks for a persisted session; if none exists, it calls `supabase.auth.signInAnonymously()` — silently, with no user action, no explanation, and no consent gesture of any kind.
- This creates a real `auth.users` row and (via a database trigger) a real `profiles` row, permanently, for every single app install — including someone who opens the app once out of curiosity and never returns.
- There is no sign-out anywhere in the codebase.
- There is no way, today, to distinguish "someone who has explored PrimeForm" from "someone with a real training history" — they are the same database row from the first second the app runs.

## Is this "anonymous authentication as a substitute for real authentication"? Yes.

This is precisely the pattern the brief's own section 9 asks me to look for, and it's present. The tell isn't that anonymous auth exists — Supabase's anonymous auth is a legitimate, well-designed feature for exactly one purpose: giving a person a real, persistent identity *before* they've decided to commit to credentials, so their in-progress activity isn't lost if they sign up later. The problem is **how PrimeForm uses it**: as an invisible, mandatory bootstrap step with no corresponding "and later they become a real account" flow, no way to leave it, and — most importantly for this milestone — no way to be a mere visitor without it firing.

Once "logged out" and "demo" become real product states (as the brief now wants), keeping today's behaviour unchanged would mean: a "logged-out" visitor opening the app still silently gets a permanent backend identity the moment the screen renders, before they've even seen the word "PrimeForm." That's not a logged-out state with a different label on it — it's the same state as today, undermining the entire point of this exercise.

## PROPOSED STATE

### Two layers, not one — client application state vs. Supabase authentication state

**Correction from the original version of this document** (formalised as Decision 3 in `FOUNDATION_DECISIONS.md`): the three states below were originally described as one flat client-side union. That conflated two genuinely different things and is worth separating explicitly, per the request not to conflate them:

- **Supabase Authentication State** — backend-verifiable, from `supabase.auth.getSession()` and kept current via `onAuthStateChange`. Only ever **`no_session`** or **`authenticated`**. This is the only state RLS, `auth.uid()`, and the database care about, and it should stay exactly that simple.
- **Client View Mode** — a purely local, on-device concept: **`logged_out`**, **`demo`**, or **`app`**. `app` is reachable only when the Supabase layer is `authenticated`. `logged_out` and `demo` are both just presentation choices made *while* the Supabase layer is `no_session` — Demo is not a backend state, an account type, or anything Supabase or RLS ever needs a concept for.

Getting this separation right is what makes "Demo never touches Supabase" a structural fact rather than a discipline someone has to remember — there is no vocabulary at the Supabase layer for "demo" to accidentally leak into. It also settles session-expiry precisely: `onAuthStateChange` firing `authenticated → no_session` (e.g. a failed refresh) sets Client View Mode to `logged_out`, never `demo` — a person whose session silently expired lands on the plain explanation screen, not back inside the walkthrough.

### The three (client-side) states, precisely defined

**1. Logged out**
- No `auth.users` row exists for this person yet. No network call to Supabase Auth has been made.
- They see a short, real explanation of what PrimeForm does (not marketing copy — see `PRODUCT_FOUNDATION.md`) and two ways forward: enter Demo, or create/sign into a real account.
- No application data is readable or writable in this state beyond the built-in catalogue, which is already public by design (`exercises`/`programs` RLS policies already grant `select` to the `anon` role for non-custom rows — this is existing, correct behaviour, not something this milestone needs to touch).

**2. Demo**
- Still no `auth.users` row. Demo is not a special kind of account — it is the deliberate absence of one, dressed up with realistic local content.
- All demo content (the reused built-in programme, the synthesized workout history, the sample profile) lives **entirely on the device**, held in memory or local-only storage, never sent to Supabase.
- Every screen showing demo content is clearly labelled as such (a persistent, unmissable indicator — the exact visual treatment is a UI decision for the implementation stage, not this document, but "clearly identified," per the brief, is a hard requirement, not a nice-to-have).
- Nothing entered while in Demo persists once it's left. This isn't a limitation to work around later; it's the entire mechanism by which "must never accidentally become mixed with a real user's data" is satisfied — there is no shared row, no shared account, no shared anything for it to mix with, by construction.

**3. Authenticated**
- A real `auth.users` row, created deliberately, via real credentials, at the moment a person chooses to create an account — never before.
- From that point on, today's existing data model applies unchanged: a `profiles` row, and every subsequent programme/exercise/workout is owned by that `auth.uid()`, governed by the RLS policies already in place (see `CURRENT_STATE.md` §5 — these were already reviewed in detail and no gap was found in the policies themselves).
- Starts either empty, or with a real, owned copy of the demo programme's *structure* if the person chose "Use this programme" — never with any copied workout history, personal records, or profile data (see `FOUNDATION_DECISIONS.md`, Decision 1, for the plan-vs-record reasoning that revised this from the original "always empty" position).

### State transition diagram

```
                         ┌─────────────┐
                         │ LOGGED OUT  │◄────────────────────┐
                         └──────┬──────┘                     │
                    ┌───────────┼───────────┐                │
              [See a demo] [Create account] [Sign in]        │
                    │           │                │            │
                    ▼           ▼                ▼            │
                ┌───────┐  ┌─────────────────────────┐        │
                │ DEMO  │  │      AUTHENTICATED       │        │
                └───┬───┘  └────────────┬────────────┘        │
                    │                   │                      │
        [Create your own PrimeForm]     │                      │
                    └──────────────────►│                      │
                                         │                      │
                                    [Sign out]────────────────►┘
```

Session expiry (an authenticated person's token lapsing) is handled by Supabase's existing `autoRefreshToken: true` behaviour for ordinary expiry — no change needed there. If the refresh itself fails (e.g. the account was revoked, or a very long period offline), the person should be returned to **Logged out**, not silently left in a broken authenticated-looking state — this is a real gap today (`CURRENT_STATE.md` §2 already flagged that an invalid persisted session isn't currently detected proactively) and should be closed as part of this work, not left as a lingering rough edge on an otherwise-cleaner model.

### What happens on sign-up / sign-in / sign-out

- **Sign-up**: real credentials are collected, `supabase.auth.signUp()` (or equivalent) is called, the trigger-created `profiles` row is now real and empty, the person lands in Authenticated with no programme selected — the same "no programme selected" empty state that exists today for a fresh anonymous user, now correctly reached only by someone who actually created an account.
- **Sign-in**: existing credentials restore the existing session and all existing data, unchanged from how session restoration already works today.
- **Sign-out**: `supabase.auth.signOut()`, clear anything cached client-side (including making sure no residual "demo" flag or authenticated-only UI state leaks into the now-logged-out view), return to Logged Out. This is a **new capability** — it doesn't exist in the app today in any form.

### Data ownership and isolation

No change to the database's ownership model is being proposed — `owner_id`/`user_id = auth.uid()` on every user-scoped table, exactly as it exists today, is correct and doesn't need touching. What changes is **when `auth.uid()` first comes to exist for a given person**, and **removing the possibility of a "logged out" or "demo" experience ever calling anything that needs it.**

One consequence worth being explicit about: this finally makes the `data_privacy.feature` scenarios (from the recent BDD work) genuinely, cheaply automatable. Today, proving "one person's programme is invisible to another" requires spinning up two separate anonymous sessions, which is awkward specifically because Supabase rate-limits anonymous sign-in (already documented as a real constraint the E2E suite had to design around). Two real, deliberately-created test accounts have no such limit — this is a concrete testing benefit of the proposed change, not just a conceptual one.

### Should the anonymous-session architecture be retained, modified, or replaced?

**Replaced, for the visitor-facing path.** Not modified-in-place, not retained-underneath. My reasoning, stated plainly because the brief asked me not to hedge:

- Keeping it as the mechanism behind "Demo" would mean Demo either (a) shares one real backend account across every visitor ever — a serious, avoidable contamination risk, exactly what the brief says must never happen — or (b) creates a fresh anonymous account per visitor, which solves contamination but recreates the exact problem this milestone exists to fix: a silent, permanent backend row for someone who was just looking.
- Keeping it as the mechanism behind "Authenticated" would mean an "authenticated" person might not actually have provided any credentials — which contradicts the brief's own definition of that state ("a real authenticated PrimeForm user with their own profile...").
- The one place anonymous auth could still legitimately earn its keep — a frictionless "try it for real, decide on credentials later" bridge — is a real, valid pattern used by other products, but it adds a genuine piece of complexity (an identity-linking/upgrade flow, using `supabase.auth.linkIdentity`, which is referenced in the current code's own comments as a someday-option but has never been built or tested). Given this milestone's explicit goal of keeping scope small and the three states crisp, **I recommend not building that bridge now.** If a future milestone wants a lower-friction path than "create an account before touching real data," that's a reasonable thing to design deliberately then — not something to smuggle back in via the current mechanism now.

### Existing anonymous users — re-verified 2026-09-21, not assumed

Automatic anonymous sign-in was already removed from the launch path in an earlier phase of this engagement (Stage 2 above), on the strength of a verification pass at the time (94 anonymous profiles, ~1 workout/1 set total). Per the current milestone's explicit instruction not to assume that still holds, this was checked again directly against the live database rather than trusted from memory:

```
anon_users: 117   real_users: 1   total_workouts: 1   total_sets: 1   custom_programs: 0
profiles_with_display_name: 0
```

- **117 anonymous users** (up from 94) — the growth is fully accounted for by this engagement's own E2E test suites and manual verification passes since the earlier check (each Playwright worker and each manual-verification pass signs in a fresh anonymous session; see `E2E_PERFORMANCE_AUDIT.md`). None of this represents real product usage.
- **1 non-anonymous user**: `silverfoxe2e+<timestamp>@gmail.com`, created 2026-09-20, zero workouts — a test account from this engagement's own auth-flow testing, not a real person.
- **1 workout / 1 set total**, dated 2026-09-18 with an id literally prefixed `verify_workout_` — a manual test artifact from earlier verification work in this engagement, not real user data.
- **Zero custom programmes anywhere.** **Zero profiles with any display name set.**

**Conclusion: no meaningful real user data exists in this Supabase project, now or at the time of the original check.** Everything present is test/development debris from this engagement itself. Per the instruction, this is documented rather than assumed, and no destructive action was taken — the stray rows above are left exactly as found, since deleting them isn't necessary for anything in this milestone and cleanup-for-its-own-sake isn't the goal here.

### What real authentication should PrimeForm use?

The brief doesn't specify a credential mechanism, so this is a genuine decision point, not something to leave implicit. My recommendation: **email + password**, as the baseline for this milestone.

Reasoning: Supabase Auth supports it natively with no extra infrastructure (unlike magic links, which need email deliverability configured and monitored, or OAuth, which needs provider app registration and a redirect/deep-link setup this Expo app doesn't currently have). It's also the option every person already understands without any product explanation. Magic-link and social sign-in are both reasonable enhancements for a later milestone, once there's a real reason (e.g. observed sign-up friction) to invest in them — building all three now would be exactly the unnecessary complexity the brief warns against elsewhere.

This does mean a password-reset flow will be needed eventually — a person **will** forget a password. **Revised** (see `FOUNDATION_DECISIONS.md`, Decision 4): on reconsideration, this is recommended as *out of scope for this milestone*, deferred to the one immediately after. Two things changed the earlier "include it now" recommendation: it turns out to need more than dashboard configuration — it requires wiring up a deep-link route through `app.json`'s currently-unused `scheme`, a genuine piece of new plumbing; and every prior audit of this project has confirmed there are no real account holders yet who could actually need it. This still requires explicit product-owner sign-off before being left out, not a silent assumption.

### Demo data separation — the actual mechanism

Stated once, precisely, since it's the crux of "must never accidentally become mixed with a real user's data":

**Demo data is never written to Supabase at all.** Not to a flagged table, not to a special account, not anywhere. It is constructed on-device from (a) the existing, real, public built-in catalogue (already safely shareable — it's not owned by anyone) and (b) a small amount of fabricated history/profile data held only in local/in-memory state for the duration of the Demo session. There is no `is_demo` column to forget to check, no shared demo account whose state could drift or get corrupted by a previous visitor, and no code path where a demo write could be mistakenly attributed to a real `auth.uid()` — because no such write ever happens. This is a case where the safest design and the simplest design are the same design.

---

## Email confirmation stays enabled — the E2E testing approach

**Decision** (confirmed): the live project's "require email confirmation before granting a session" setting stays exactly as it is. It will not be disabled to make automated testing easier, and the product must behave correctly with it enabled — which it now does: `signUpWithEmail` returns a distinct `{ status: "confirmation_required" }` result rather than throwing, and `AuthFlow.tsx`'s sign-up screen shows a genuine "Check your email" confirmation state, never conflated with an error.

**The automated-testing approach**: a single, dedicated, clearly-named test account (e.g. `silverfox.e2e.dedicated.test.account@<a real domain>` — this project's Supabase instance rejects placeholder domains like `.internal`/`example.com`, so a real deliverable domain is required), created once via the ordinary `signUp` API exactly like any real account, then confirmed with **one** direct, one-row administrative action:

```sql
update auth.users set email_confirmed_at = now() where email = '<the dedicated test account's email>';
```

This is not a bypass of authentication — it is the same action Supabase's own dashboard performs via its "Confirm user" button, scoped to exactly one account that never represents a real person. The confirmation *requirement* is untouched for every other account, real or test. Sign-in tests (session restoration, sign-out, data isolation with a real second identity) use this one account's credentials; sign-up itself is still tested against the real, enabled confirmation flow (asserting that the "Check your email" state appears — see above — not that a session is granted immediately).

**Status**: attempted to actually create this account during this session and hit the project's own outbound-email rate limit (`email rate limit exceeded`) — the same constraint already documented in `PROGRESSION_LOGIC_AUDIT.md`-adjacent testing earlier this engagement. This is a real, currently-active constraint, not a flaw in the mechanism. **Follow-up required**: once the rate-limit window clears (or via the Supabase dashboard directly, which may not share the same programmatic limit), run the one `signUp` call plus the one SQL statement above to actually provision this account before it's relied on by any E2E test.

## Summary recommendation

| Question | Answer |
|---|---|
| Retain, modify, or replace the anonymous-session architecture? | **Replace it as the default/automatic entry point.** Its underlying mechanism (`signInAnonymously`) doesn't need to be deleted from the codebase, but nothing in the proposed model calls it. |
| What makes someone "Authenticated"? | Real credentials (email + password), deliberately provided. |
| What makes someone "Demo"? | Nothing backend-related at all — a local, ephemeral, clearly-labelled walkthrough. |
| Does the RLS/ownership model need to change? | No — it's already correct. Only *when* an owning identity is created changes. |
| Is sign-out new work? | Yes — it doesn't exist today in any form. |
| Is password reset in scope? | **Revised: no** — deferred to the following milestone, pending explicit product-owner sign-off (`FOUNDATION_DECISIONS.md`, Decision 4). |
