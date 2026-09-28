# PrimeForm — Current State

**Status: factual audit, no code changed.** Everything below is derived directly from the code, database migrations, and existing tests as they exist today. Where something looks incomplete or wrong, it is reported as a gap, not fixed or redesigned.

---

## 1. Architecture

**Monorepo** (Turborepo + pnpm workspaces):

| Package | Role |
|---|---|
| `apps/mobile` | The actual product — an Expo (React Native + Expo Router) app, run as a native app or as a web build (`expo start --web`). This is PrimeForm. |
| `apps/web` | A separate design-system showcase (Next.js). Does not implement any PrimeForm product screens or logic. Not covered further here. |
| `packages/domain` | Pure business logic — progression, session/workout math, PRs, volume, consistency, validation rules. No I/O. |
| `packages/types` | Shared branded ID types (`UserId`, `ProgramId`, etc.) and small shared types. |
| `packages/config` | Design tokens (color, spacing, typography, touch targets) and the `Theme` type. |
| `packages/ui` | Cross-platform primitive components (`Button`, `Card`, `Modal`, `EmptyState`, `LoadingState`, etc.), each with a `.native.tsx` and web variant where needed. |
| `packages/validation` | Zod-style entity validation schemas, tested independently of the DB. |
| `supabase/migrations` | The Postgres schema, RLS policies, and triggers — the actual backend. |
| `supabase/seed.sql` | Generated (via `apps/mobile/scripts/generateSeedSql.ts`) from `apps/mobile/data/seedExercises.ts` and `data/programmeCatalogue.ts` — the built-in exercise/programme catalogue. |

**Backend model**: there is no custom server/API layer. The mobile app talks **directly to Supabase** (Postgres + Auth + Row Level Security) via `@supabase/supabase-js`. All business rules that must be trustworthy (ownership, data limits) are enforced as Postgres `CHECK` constraints and RLS policies — there is no middleware API to add a second enforcement layer.

**State management**: no Redux/Zustand/etc. State is:
- Local React state + custom hooks (`hooks/use*.ts`), each hook wrapping a `lib/repositories/*.ts` call to Supabase and exposing `refresh()`.
- Two React Context providers: `ActiveSessionProvider` (the in-progress workout, device-local — see §2/§4) and `ThemeProvider`.
- `lib/repositories/sessionRepository.ts` persists the in-progress workout to `AsyncStorage` (native) / `localStorage` (web) under the key `silverfox:activeSession` — this is the **only** client-only, never-in-Postgres piece of state in the app.

**Data flow for a typical screen**: Screen → hook (`useX`) → repository (`lib/repositories/xRepository.ts`) → `supabase-js` call → Postgres table, gated by that table's RLS policy.

---

## 2. Authentication

**There is no login, sign-up, or password screen anywhere in the app.** The entire authentication model is:

- `lib/supabase/auth.ts`: `ensureSession()` calls `supabase.auth.getSession()`; if no session exists, it calls `supabase.auth.signInAnonymously()`. This runs once, automatically, the first time the app is ever opened on a device.
- The resulting Supabase Auth session (a real JWT, `auth.uid()` populated) is persisted via `AsyncStorage`/`localStorage` (`persistSession: true`, `autoRefreshToken: true`, configured in `lib/supabase/client.ts`). On every subsequent app open, the persisted session is restored — no new anonymous user is created.
- A Postgres trigger (`handle_new_auth_user` in `profiles.sql`) auto-creates a `profiles` row for every new `auth.users` row (anonymous or not) — the app never explicitly "creates a user."
- `app/_layout.tsx`'s `SessionGate` component calls `ensureSession()` on mount and renders:
  - `LoadingState` ("Connecting…") while the promise is pending,
  - the full app (`children`) once resolved,
  - an `ErrorState` with a "Try Again" retry button if it rejects (e.g. missing/invalid Supabase config, network failure).
- There is no sign-out anywhere in the UI, no sign-out function in `lib/supabase/auth.ts`, and no code path that clears the persisted session deliberately.
- Every screen behind `SessionGate` assumes a session already exists; `getCurrentUserIdSync()` in `auth.ts` throws if called before `ensureSession()` resolves (this cannot happen in practice, since nothing renders until it does).

### What a logged-out user sees

There is no logged-out state as a product concept. A user who has never opened the app before sees "Connecting…" for a moment while an anonymous session is silently created, then lands directly on Home — indistinguishable from a "signed-in" user, because anonymous sign-in *is* the signed-in state.

### What happens on session expiry / Supabase unreachable

- `autoRefreshToken: true` means an ordinary token expiry is refreshed silently in the background — no user-visible effect.
- If Supabase is genuinely unreachable, or misconfigured (missing `.env`), `ensureSession()`'s promise rejects and `SessionGate` shows the `ErrorState` retry screen. There is no distinction shown between "network down" and "misconfigured project" beyond the raw error message.
- If the *anonymous user itself* is deleted server-side (e.g. by an admin), the persisted session becomes invalid; the app does not currently detect this proactively — the first Supabase call that needs `auth.uid()` would fail, surfacing as an unhandled rejection (see §8/§11), not a graceful re-authentication.

### Which routes require authentication

All of them, structurally — there is no route that renders without `SessionGate` having resolved first, since `SessionGate` wraps the entire `<Stack>` in the root layout. There is no per-route auth check because there is nothing to distinguish (every user is "authenticated" the instant the app opens).

### Redirects

- No redirect logic exists for unauthenticated → login, because there is no login screen to redirect to.
- No redirect logic exists for authenticated → away-from-auth-screens, for the same reason.

### Simulated/hard-coded auth state

None found. `ensureSession()` fully replaced an earlier hard-coded `LOCAL_USER_ID` constant (per its own doc comment) — every user id in the running app is a real `auth.uid()` from a real (anonymous) Supabase session.

### Data accessible while logged out

"Logged out" cannot happen in this app's UI, but at the API/database level: Supabase's `anon` role (a request with no valid session at all) **can** read:
- All built-in (non-custom) exercises and programmes and their nested sessions/exercises (`owner_id is null` / `not is_custom`), because those SELECT policies grant `to authenticated, anon`.
- All `media_assets` (also `to authenticated, anon`).
- Nothing else — every user-owned table (`workouts`, `workout_sets`, `conditioning_sessions`, `mobility_sessions`, `body_measurements`, `progress_photos`, custom `programs`/`exercises`, `profiles`) requires `to authenticated` and an owner match, which `anon` can never satisfy since `auth.uid()` is `null` for that role.

### Actual state diagram (as implemented — not the idealized one)

```
APP LAUNCH
   │
   ▼
[SessionGate: "Connecting…"]
   │
   ├── ensureSession() finds a persisted session ──────────┐
   │                                                        │
   ├── ensureSession() finds none → signInAnonymously() ────┤
   │                                                        │
   ▼                                                        ▼
[ensureSession() rejects]                          [AUTHENTICATED — always,
   │                                                 anonymous, invisible to user]
   ▼                                                        │
[ErrorState: "Couldn't connect", Try Again] ──(retry)──►    │
                                                             ▼
                                                    [APPLICATION — Home/tabs]
                                                             │
                                                    (no sign-out path exists)
```

There is no SIGN UP / SIGN IN step, and no SIGN OUT → LOGGED OUT loop-back — the idealized diagram in the request does not match the implementation at any point after first launch.

---

## 3. Screen and Route Inventory

(Route list, purpose, and CRUD/input columns already exhaustively catalogued in [`apps/mobile/e2e/JOURNEY_INVENTORY.md`](apps/mobile/e2e/JOURNEY_INVENTORY.md), produced by direct inspection of every file under `app/**`; summarized and cross-checked here rather than re-derived.)

| Route | Auth required | Reached from | Loads | Writes |
|---|---|---|---|---|
| `/` (Home) | Yes (structurally, all routes) | App launch, any tab bar "Home" tap | active programme, today's day, week overview, streak/PR/volume stats, active-session resume state | none directly (navigates elsewhere to write) |
| `/workouts` | Yes | Tab bar | active programme's days, workout history, conditioning/mobility sessions | none directly |
| `/workouts/log-cardio` | Yes | Workouts tab action | — | `conditioning_sessions` insert |
| `/workouts/log-mobility` | Yes | Workouts tab action | — | `mobility_sessions` insert |
| `/programs` | Yes | Tab bar, Home | catalogue + custom programmes, active-programme flag | "Make my programme" updates `profiles.active_program_id` |
| `/programs/new` | Yes | "+ Create a custom programme" | — | `programs` + `program_sessions` insert |
| `/programs/[programId]` | Yes | Programme card tap | one programme, its sessions/exercises | name/description edit, day add/remove, "make active" |
| `/programs/[programId]/day/[dayId]/add-exercise` | Yes | "Add Exercise" on detail | exercise library (search/filter) | none (navigates to configure on pick) |
| `/programs/[programId]/day/[dayId]/exercise/[programExerciseId]` | Yes | Add-exercise pick, or tapping an existing day exercise | one `program_exercises` row (or defaults if `id="new"`) | insert (new) or update (existing) `program_exercises`; delete via "Remove" |
| `/exercises` | Yes | Tab bar | exercise library | none directly |
| `/exercises/new` | Yes | "+" on library | — | `exercises` insert |
| `/exercises/[exerciseId]` | Yes | Exercise card tap | one exercise + workout-set history for PRs/chart | none |
| `/progress` | Yes | Tab bar | workout history, conditioning, physique (per sub-tab) | measurement logging (Physique tab) |
| `/profile` | Yes | Home avatar button | own `profiles` row | update on Save |
| `/workout/active` | Yes | "Start {day}" on Workouts | in-progress session (device-local) + previous-session values per exercise | set complete/uncomplete/remove, exercise target edits — all device-local until Finish |
| `/workout/summary` | Yes | Finish workout | just-finished workout's stats/PRs | none (workout itself already written by `finishSession`) |

Loading/empty/error states, per the existing inventory: `LoadingState`/`EmptyState`/`ErrorState` primitives from `packages/ui` are used inconsistently — some screens show a loading spinner and an empty-state message (e.g. Home, Workouts, Exercise library), but **no screen shows an error state for a failed data-write**, only `SessionGate` has an error state at all (see §8/§11).

---

## 4. Complete User Journeys (as implemented)

1. **First launch**: app opens → "Connecting…" → anonymous session created + profile row auto-created → Home, with no programme selected → `EmptyState` "No programme selected" prompting to browse the catalogue.
2. **Returning launch (existing session)**: app opens → "Connecting…" (session restored from storage, not re-created) → Home reflecting prior state.
3. **Registration / login**: does not exist as a distinct journey — see §2.
4. **Logout**: does not exist as a journey — no control anywhere triggers it.
5. **Onboarding**: does not exist as a distinct flow. The closest equivalent is manually filling in `/profile` (name, age, experience, goals, training days, equipment) and separately picking a programme from `/programs` — neither is required or prompted for on first launch.
6. **Choosing/activating a programme**: browse `/programs` (built-in catalogue + own custom ones) → tap a card → tap "Make this my programme" → `profiles.active_program_id` updates → Home/Workouts now show that programme's days.
7. **Creating a custom programme**: `/programs/new` → name, description, days/week (stepper), day names → Create → programme + its sessions inserted → redirected to the new programme's detail screen.
8. **Editing a programme**: detail screen → "Edit Details" → change name/description → save (repository update). Day exercises are added/reordered/removed from the same detail screen; days are added ("+ Add Day") and removed ("Remove day").
9. **Adding an exercise to a day**: detail screen → "Add Exercise" → search/filter picker → pick one → lands on the configure screen (`id="new"`) with library-recommended defaults (rest seconds) → set target sets/rep range/RIR/rest via steppers → "Add to Day" → `program_exercises` insert.
10. **Editing a programme exercise's targets**: tap an existing exercise row on the detail screen → same configure screen, now pre-filled from the existing row → adjust via steppers → "Save Changes" → update.
11. **Creating a custom exercise**: `/exercises/new` → name, primary/secondary muscle groups (chips), equipment (chips), description, instructions (repeatable steps) → Save → insert, redirected to its detail page. **There is no edit or delete UI for a custom exercise once created** — only create exists.
12. **Starting a workout**: Workouts tab → active programme's days listed with exercise counts → tap "Start {dayName}" → `ActiveSessionProvider.startSession()` builds an in-memory `WorkoutSession` (device-local only) → `/workout/active`.
13. **Logging a set**: on the active-workout screen, each set row shows weight (now a +/-1kg stepper, default 20kg), reps (free text), RIR (free text, optional), and a "Log" button (enabled once reps is non-empty) → tap Log → set marked complete client-side only; nothing is written to Postgres yet.
14. **Editing/removing a set before completion**: an un-completed set's weight/reps/RIR can still be changed; a set can be removed entirely via its "✕" — both device-local, both only possible *before* it's logged as complete.
15. **Finishing a workout**: "Finish workout" → `finishSession()` computes summary stats and **writes the whole workout + only its completed sets** to `workouts`/`workout_sets` in one go → `/workout/summary` shows stats/PRs → active session cleared from device storage.
16. **Discarding a workout**: available while in progress (before Finish) — clears the device-local session; nothing was ever written to Postgres, so there is nothing to delete server-side.
17. **Viewing workout history**: Workouts tab / Progress tab read `workouts`/`workout_sets` (only ever completed ones, per finding above) — there is no journey to view or resume an *unfinished* workout after a discard or app close mid-session (it would still be in device storage, recoverable, until either Finish or Discard is tapped — but not after `localStorage`/`AsyncStorage` is cleared by the OS/browser).
18. **Editing a completed workout / historical set**: **no UI exists for this at all.** `workouts`/`workout_sets` have `update` RLS policies (owner-scoped), so the database *could* support it, but no screen calls an update on either table after `finishSession` runs.
19. **Logging conditioning/mobility sessions**: `/workouts/log-cardio` and `/workouts/log-mobility` — simple forms (type/focus, duration via stepper, notes) → insert. No edit/delete UI for either.
20. **Logging a body measurement / progress photo**: from the Progress tab's Physique sub-view → insert into `body_measurements`/`progress_photos`. No edit/delete UI found for either.
21. **Editing profile**: `/profile` → change any field → Save → update own `profiles` row. Age is bounded 13–120 at the DB level (client now also caps other fields — see §6).

---

## 5. Database

All tables live in the `public` schema, RLS-enabled, described by migrations under `supabase/migrations/` (chronological, latest first where relevant):

### `profiles`
One row per `auth.users` row (1:1, `id` is both PK and FK to `auth.users.id on delete cascade`), auto-inserted by the `handle_new_auth_user` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK/FK | = `auth.users.id` |
| `display_name` | text | nullable |
| `email` | text | nullable (anonymous users have none) |
| `preferred_weight_unit` | text | `check in ('kg','lb')`, default `'kg'` |
| `training_experience` | text | `check in ('beginner','intermediate','advanced')`, nullable |
| `goals` | text[] | nullable |
| `preferred_training_days_per_week` | smallint | `check between 1 and 7`, nullable |
| `available_equipment` | text[] | nullable |
| `age` | smallint | `check between 13 and 120`, nullable (added in the hardening migration) |
| `active_program_id` | text | FK → `programs.id on delete set null`, nullable |
| `created_at`/`updated_at` | timestamptz | auto |

**RLS**: `select`/`update`, owner-only (`id = auth.uid()`). **No `insert` or `delete` policy** — rows are created only by the `security definer` trigger and never deleted directly (cascades from `auth.users` deletion instead). A user cannot read or write another user's profile.

### `exercises` / `exercise_substitutions`
`exercises`: `id` (text PK, app-generated), `name` (1–120 chars), `primary_muscle_group` (enum), `secondary_muscle_groups` (text[]), `equipment` (enum), `rep_unit` (`reps`/`seconds`), `difficulty`, `movement_pattern`, `description` (≤500 chars), `why`, `instructions`/`form_cues`/`common_mistakes` (text[]), `setup`/`execution`/`breathing_cue`/`progression_guidance`/`regression_or_substitution`, `recommended_rest_seconds` (>0, nullable), `media_asset_id` (FK, nullable), `is_custom` (bool, default true), `owner_id` (FK → `auth.users`, nullable — null means built-in). `check`: `owner_id` required when `is_custom`.

`exercise_substitutions`: composite PK (`exercise_id`, `substitute_exercise_id`), `check` no self-reference.

**RLS**: select is `to authenticated, anon` — visible if built-in (`owner_id is null`) or owned; insert/update/delete are owner-only, `to authenticated`. A user **cannot** modify another user's custom exercise, and cannot see another user's custom exercise at all (only their own + all built-ins).

### `programs` / `program_sessions` / `program_exercises`
`programs`: `id`, `owner_id` (nullable = built-in), `name` (1–80 chars), `description` (≤500), `category`/`difficulty`/`primary_goal` (enums), `target_audience` (≤300), `days_per_week` (1–7), session-minute range (low/high, ordered), `secondary_goals`, `philosophy`/`progression_method`/`deload_strategy` (≤500 each), `is_custom` (default true). `check`: `owner_id` required when custom; low ≤ high.

`program_sessions` ("days"): `id`, `program_id` FK cascade, `name` (1–80), `order` (≥0, deliberately non-unique per program — see migration comment), `focus` (enum).

`program_exercises`: `id`, `session_id` FK cascade, `exercise_id` FK **restrict** (can't delete an exercise that's in use), `order`, `target_sets`/`target_rep_range_low`/`target_rep_range_high` (all >0, range ordered), `target_rir` (0–10, nullable), `rest_seconds` (>0, nullable), `tempo` (regex `^\d+-\d+-\d+-\d+$`, nullable), `warmup_sets` (≥0, nullable), `notes` (≤300).

**RLS**: select on all three is `to authenticated, anon`, visible if built-in or owned (sessions/exercises inherit visibility by joining back to `programs`). Write policies are owner-only (`for all`, checked via the same join). A user cannot write to another user's programme, its days, or its exercises; a user cannot read another user's *custom* programme at all.

### `workouts` / `workout_sets`
`workouts`: `id`, `user_id` FK cascade (**not nullable — always owned**), `program_id`/`session_id` FK **set null** (kept as history even if the programme is later changed/deleted), `started_at`, `completed_at` (nullable, `check` ≥ started_at).

`workout_sets`: `id`, `workout_id` FK cascade, `exercise_id` FK restrict, `order`, `weight` (numeric, `>= 0`), `weight_unit` (enum), `reps` (integer, `>= 0`), `rir` (0–10, nullable).

**RLS**: every operation (select/insert/update/delete) is strictly owner-only, `to authenticated` (no `anon` at all) — via `user_id = auth.uid()` directly on `workouts`, and via a join to the parent workout on `workout_sets`. **A user cannot see, write, or modify another user's workout data under any circumstance** — this is the most tightly scoped table set in the schema, appropriately so.

### `conditioning_sessions` / `mobility_sessions` / `body_measurements` / `progress_photos`
All four: `id`, `user_id` FK cascade, a type/focus enum (first two only), `date`, `duration_minutes` (>0) or measurement fields, `notes`/`note` (≤500). **RLS**: `for all`, strictly owner-only, `to authenticated`, identical shape across all four.

### `media_assets`
`id` (text PK), `type` (enum incl. `placeholder`), `url`/`thumbnail_url`, `duration_seconds`, `metadata` (jsonb), `source`/`status` enums, `alt_text`. `check`: `url` required unless placeholder. **RLS**: select `to authenticated, anon`, `using (true)` — fully public read; no insert/update/delete policy at all (write-only via service role, never from the app).

### `recipe_*` / `ingredients` (foundations only)
`recipe_sources`, `recipe_categories`, `ingredients`, `recipes`, `recipe_ingredients` — full schema and RLS exist (same built-in-or-owned pattern as exercises/programs), but **no domain type, no repository, no UI consumes any of this yet** (explicitly stated in the migration's own comment). Not a functional part of the app today.

### Cross-user data isolation — summary

Every table that should be private to one user (`profiles`, `workouts`, `workout_sets`, `conditioning_sessions`, `mobility_sessions`, `body_measurements`, `progress_photos`, and custom rows in `exercises`/`programs`/their children) enforces `owner_id`/`user_id = auth.uid()` on every policy that matters, with no gaps found across all nine migrations. No cross-user leak was found in the RLS layer itself. The only broad-read data is explicitly-intended-public reference data (built-in catalogue, media assets).

---

## 6. Input Validation

| Input | Screen | Control (as of this audit) | Client-side validation | DB constraint |
|---|---|---|---|---|
| Programme name | New/Edit Programme | free-text | **Fixed during this session**: `maxLength={80}` + a caught save-error message | `char_length between 1 and 80` |
| Programme description | New/Edit Programme | free-text, multiline | none | `char_length <= 500`, nullable |
| Day name(s) | New Programme, Add Day | free-text | none | `char_length between 1 and 80` |
| Exercise name | New Exercise | free-text | **Fixed during this session**: `maxLength={120}` + a caught save-error message | `char_length between 1 and 120` |
| Exercise description | New Exercise | free-text, multiline | none | `char_length <= 500` |
| **Weight (kg)** | Active workout set row | **Changed during this session**: +/-1kg stepper, default 20kg, clamped [0, 500] | structurally cannot be non-numeric, decimal, negative, or empty | `numeric not null check (weight >= 0)` |
| Reps | Active workout set row | free-text, `keyboardType="decimal-pad"` | only a non-empty check (`canComplete`) — **does not verify the value parses as a number** | `integer not null check (reps >= 0)` |
| RIR | Active workout set row | free-text, optional | none | `numeric check (rir between 0 and 10)`, nullable |
| Target sets / rep range / RIR / rest | Configure Programme Exercise | `Stepper` (buttons only) | structurally numeric | various `>0`/ranged checks |
| Age | Profile | free-text, `keyboardType="number-pad"` | none | `smallint check (age between 13 and 120)` |
| Preferred training days/week | Profile | `Stepper`, 1–7 | structurally numeric | `smallint check (... between 1 and 7)` |
| Cardio/mobility duration | Log Cardio/Mobility | `Stepper` | structurally numeric | `numeric not null check (duration_minutes > 0)` |
| Notes (cardio/mobility) | Log Cardio/Mobility | free-text, multiline | none | `char_length <= 500` |

**Confirmed-fixed during this session** (previously HIGH-severity findings, now resolved): programme/exercise name over-length now shows a visible error and is capped client-side; weight can no longer be a non-numeric/negative/NaN-producing value.

**Still missing/inconsistent, confirmed by direct testing this session**:
- **Reps** can still be any text (`keyboardType="decimal-pad"` is a soft hint, not an enforced type) — letters, decimals, negative numbers, and NaN-producing strings all pass the non-empty gate and can reach "Complete Set" client-side; a Postgres `integer` cast then rejects clearly-invalid ones (`abc`) with an unhandled rejection and no visible message (see §8/§11), while some borderline-plausible ones may coerce unexpectedly.
- **RIR** has no client-side range/type validation at all; out-of-range or non-numeric values are only caught (silently) by the DB check.
- **Description/notes/day-name fields** have no client-side length limit anywhere — a value can be typed well past its DB limit and only fails at save time, silently (no error surfaced), consistent with the systemic gap in §11.
- **No input in the app has a visible inline validation message** (e.g. "must be 1–80 characters") shown *before* submission — the only client-side gates found are binary enable/disable of a submit button (`canSave`/`canComplete`), never explanatory text.

---

## 7. Navigation

There is exactly one navigation state — there is no separate logged-out navigation tree.

```
LOGGED-OUT NAVIGATION: does not exist as a distinct state.

LOGGED-IN NAVIGATION (the only navigation that exists):

  Bottom tab bar (always present on the 5 "tabs" routes):
    Home ─┬─ Workouts ─┬─ Programmes ─┬─ Exercises ─┬─ Progress
          │            │              │             │
          │            ├─ /workouts/log-cardio      │
          │            ├─ /workouts/log-mobility    │
          │            └─ /workout/active → /workout/summary
          │                             │
          │            ┌────────────────┴─ (stack push, up to 4 deep)
          │            ▼
          │       /programs/new
          │       /programs/[id]
          │         └─ /programs/[id]/day/[dayId]/add-exercise
          │              └─ /programs/[id]/day/[dayId]/exercise/[peId]
          │
          ├─ /exercises/new
          ├─ /exercises/[id]
          │
          └─ (Home avatar) → /profile   (stack, native header, back button)
```

Additional notes:
- Expo Router's stack keeps previously-visited screens mounted in the background when a new one is pushed on top (confirmed empirically this session, twice, via Playwright — a background-mounted screen's text/labels remain queryable even while a foreground screen is active).
- `workout/active` sets `gestureEnabled: false` (deliberately blocks the OS back-swipe/gesture while a workout is in progress).
- There is no drawer, no modal-based navigation, and no deep-linking scheme documented beyond the Expo Router file-based routes themselves (`scheme: "silverfox"` is declared in `app.json` but no code was found consuming incoming deep links).

---

## 8. Functional Behaviour

### Working
- Anonymous session bootstrap, persistence across restarts, and the loading/error/retry UI for it.
- Full programme CRUD (create, view, edit name/description, add/remove day, delete custom programme) with correct RLS-backed ownership.
- Programme-exercise configuration (add/edit/remove), including a working "Add Exercise" search/filter picker.
- Custom exercise creation with muscle-group/equipment chip selection.
- Starting a workout, logging sets (weight via stepper, reps/RIR via text), completing/un-completing/removing individual sets, finishing a workout (writes to `workouts`/`workout_sets` in one batch), viewing the post-workout summary.
- Workout history display and progress stats (streak, volume, PRs) reading from real logged data.
- Profile editing, including the age boundary constraint.
- Conditioning/mobility session logging.
- Cross-user data isolation at the RLS layer (verified across every table this session — no leak found).
- The bottom tab bar's safe-area handling code (`useSafeAreaInsets`, adds the live inset to height/padding) is structurally correct; whether it renders correctly on all real devices is unverified by any tool available in this project (see §11).

### Partially implemented
- **Reps/RIR input validation**: a non-empty gate exists, but no type/range validation — confirmed exploitable this session.
- **Free-text length limits**: enforced at the DB layer everywhere, but only *some* fields (programme/exercise name, after this session's fix) surface that limit to the user before or after submission; most description/notes fields do not.
- **Error surfacing**: `SessionGate` has a real error UI; almost nothing else in the app does (see Broken, below).
- **Recipes/nutrition schema**: fully migrated and RLS-protected, but has zero application code consuming it — a backend-only stub.

### Broken / incorrect
- **No screen catches a failed Save/Create/Log beyond the two fields fixed this session.** Every other repository-calling handler in the app has no `try/catch`; a rejected Postgres write (constraint violation, network failure, RLS denial) becomes an unhandled promise rejection with no user-visible feedback — the user is left believing the action may have succeeded when it silently didn't.
- **`Stepper.tsx`'s increment/decrement compute the next value from the closed-over `value` prop** (`onChange(value +/- step)`) rather than a functional update. Two taps faster than a render cycle can both read the same stale value, netting +1 instead of +2 (directly observed and reproduced this session on the programme-exercise configuration screen). This affects every `Stepper` usage in the app (target sets/reps/RIR/rest, training days/week, cardio/mobility duration) — not just weight logging, which was separately fixed to a bespoke stepper that does not share this bug.
- **No edit or delete UI for a custom exercise** once created, despite the DB/RLS fully supporting both.
- **No edit or delete UI for a completed workout**, a logged body measurement, or a progress photo, despite `update`/`delete` RLS policies existing for all of them.
- **No sign-out capability anywhere** — not necessarily "broken" against current product intent, but worth flagging since the request explicitly asked about it.

---

## 9. Existing Test Coverage

### Unit (Vitest, no I/O) — `packages/domain/src/__tests__/*`, `packages/validation/src/__tests__/*`, `packages/domain/tests/logic/suggestNextLoad.test.ts`
Covers: progression/load-suggestion rules, one-rep-max math, personal records, volume, consistency/weekly-overview calculations, session state transitions, reorder logic, workout summary math, programme validation, entity schema validation. These are pure-function tests against real inputs/outputs — no mocking needed since `packages/domain` has no I/O. Appear reliable (isolated, deterministic).

### Component / hook (Vitest + Testing Library, jsdom) — `apps/mobile/{components,hooks,providers,app}/**/__tests__/*`
Covers: `SetRow` (rewritten this session for the new weight stepper — 4 tests), `ExerciseMedia`, `ActiveSessionProvider` (session state transitions), `ThemeProvider`, `useElapsedSeconds`, `useRestTimer`, exercise-detail screen. Render real components against a fake theme/navigation context; reliable in the same sense as any RTL suite (fast, isolated, no network).

### Repository / "integration" (Vitest, against an **in-memory fake**, not a real Postgres) — `apps/mobile/lib/repositories/__tests__/*`, `apps/mobile/data/__tests__/programmeCatalogue.test.ts`
Covers: workout save/list, program day management, program history integrity, session repository (device-local storage), user repository, Supabase row-mapping functions. Uses `test/fakeSupabase.ts` — **does not exercise real RLS policies, real Postgres constraints, or real network behavior.** A bug that only manifests against real Postgres (e.g. a constraint this audit found, like the two silent-failure cases) would not be caught here.

### E2E (Playwright, against the real Expo web build + a real Supabase test backend) — `apps/mobile/e2e/journeys/*.spec.ts`
The only tests in the repo that exercise the real database, real RLS, and the real UI together. 8 files, 66 tests as of this session's last clean run, all passing: session bootstrap, programme CRUD + name-length/security-payload fuzzing, exercise library + creation + name-length fuzzing, workout logging (weight-stepper behavior, reps/RIR fuzzing, NaN propagation), navigation (tabs, deep links, back button, mobile-viewport tab-bar bounds), profile CRUD + age boundary, full edit-cycle (create→edit→refresh→verify, plus a dedicated Stepper race-condition regression test), and the Alert.alert-on-web testability gap for delete workflows. Confirmed reliable after this session's fixture rework (shared-page-per-worker architecture, ~3x faster, no cross-test contamination found across a clean full run).

**Known, disclosed gap in this suite** (its own documentation): Android system-navigation-bar overlap cannot be verified by any browser-based tool, Playwright included.

### Coverage gaps across all of the above
- **No database-level test suite** — nothing runs SQL/RLS policies directly (e.g. via `pgTAP` or a raw Postgres client) independent of the app. All RLS confidence in this document comes from reading the policies plus the E2E suite's incidental exercise of them.
- **No test verifies cross-user data isolation directly** (e.g. "user B's request for user A's workout returns nothing") — the E2E suite always operates as a single shared test user (by design, to dodge Supabase's anonymous-sign-in rate limit), so this specific, security-relevant property has never actually been exercised by an automated test.
- **No test exists for the progression/load-suggestion logic against the real API+DB** — `packages/domain`'s unit tests cover the pure function in isolation only.
- **The reps/RIR/Stepper-race findings above have zero regression coverage** except the one dedicated Stepper test added this session; reps/RIR's remaining gaps have no regression test at all yet.

---

## 10. Proposed BDD Functional Specification (scenarios to eventually automate — not implemented)

**Authentication**
- A first-ever app launch establishes an anonymous session and reaches Home without any credential prompt.
- A relaunch with a persisted session skips sign-in entirely and restores prior state.
- A launch with no reachable Supabase project shows a retry-capable error, not a crash.
- (If sign-out/real accounts are ever added) signing out clears the persisted session and returns to a pre-auth state; signing back in restores the same user's data.

**Navigation**
- All five bottom tabs are reachable and show distinct content from any starting tab.
- Deep programme navigation (list → detail → add-exercise → configure) unwinds correctly via back navigation at every level.
- The active-workout screen blocks/handles the OS back gesture without silently losing the in-progress session.
- A background-mounted previous screen's content is never accidentally interactable/ambiguous to an assistive technology user (this session found it *is* still present in the accessibility tree — worth a dedicated scenario).

**Onboarding**
- (Does not exist yet — no scenarios to write until a flow exists.)

**Dashboard (Home)**
- Home reflects the currently active programme, today's scheduled day, and accurate week/streak/volume/PR stats.
- Home with no active programme shows the correct empty-state prompt, not a blank/broken screen.

**Programme management**
- Create, view, edit name/description, add/remove a day, and delete a custom programme, each verified against the database afterward.
- A built-in catalogue programme cannot be edited or deleted (no such affordance is offered).
- Programme name/description respects its DB length limit, with a visible error if exceeded (now fixed — should be a permanent regression scenario).

**Workout management**
- Starting a workout from a programme day creates the correct in-memory session matching that day's configured exercises.
- Finishing a workout persists exactly the completed sets, and only the completed sets, to the database.
- Discarding a workout writes nothing to the database and clears local state.
- Refreshing mid-workout does not lose already-logged sets (device-local persistence).

**Exercise management**
- Browse, search, and filter the exercise library correctly.
- Create a custom exercise; it appears in the library and its own detail page.
- Exercise name respects its DB length limit, with a visible error if exceeded (now fixed).
- (Gap, not yet a passing scenario) editing or deleting a custom exercise — no UI exists to test yet.

**Set logging**
- Weight can only change in fixed 1kg steps, defaults sensibly, and cannot go negative or above a sane ceiling (implemented and tested this session).
- A set cannot be logged with empty reps.
- Reps/RIR accept only sensible values, with a clear error otherwise (currently a **known gap**, not yet true — the scenario should assert the *intended* behavior and is expected to fail until fixed).
- A NaN-producing reps value is rejected before reaching Postgres (currently a **known gap**).

**Workout completion**
- The post-workout summary reflects the actual sets logged (weight/reps/PRs).
- A finished workout appears correctly, and only once, in workout history.

**Workout history**
- History reflects only completed workouts; an in-progress/discarded session never appears.
- Persistence after navigation away and back, and after a full refresh.

**User profile**
- Editing and saving every profile field persists correctly and survives a refresh.
- Age outside 13–120 is rejected, with a visible message (currently a **known gap** — DB rejects silently).

**Input validation**
- Every free-text field at or under its DB limit saves successfully; over the limit is rejected with a visible message (true for programme/exercise name only today; false for every other free-text field — each should be its own scenario, most currently failing).
- Security-style payloads (SQL-like, HTML-like, script tags, path traversal, null bytes, Unicode edge cases) are stored inertly as text or rejected with a clear message — never executed, never causing a crash (already covered for programme/exercise names; not yet covered elsewhere).

**Error handling**
- Any failed save shows a visible, specific error message and leaves the form's entered data intact (currently a **known, systemic gap** outside the two fields fixed this session — most scenarios here are expected to fail until addressed).

**Database/data isolation**
- User A can never read, update, or delete User B's workouts, sets, profile, or custom programmes/exercises, verified by direct API calls as two distinct authenticated identities (not yet automated anywhere — see §9).
- An unauthenticated (`anon`-role) request can read built-in catalogue data and media assets, and nothing else.

---

## 11. Critical Gaps

| Gap | UI | Frontend logic | Backend/DB | Auth | RLS | Existing tests |
|---|---|---|---|---|---|---|
| Reps/RIR can be non-numeric or out-of-range | exposes free text with no visible limit | no type/range check | DB rejects invalid casts, but only for clearly-invalid strings | n/a | n/a | fuzzed and documented, not yet fixed |
| Failed saves are silent almost everywhere | no error UI on ~every screen but `SessionGate` and the two fixed fields | no try/catch | correctly rejects invalid data | n/a | n/a | documented as findings, not covered as a passing/failing regression suite |
| `Stepper` stale-closure race | UI behaves inconsistently under fast taps | root cause in shared component | n/a | n/a | n/a | one regression test exists (this session); every other `Stepper` use is unguarded |
| No custom-exercise edit/delete UI | missing entirely | missing entirely | fully supported (owner-scoped RLS) | n/a | correctly scoped | not testable until UI exists |
| No completed-workout edit/delete UI | missing entirely | missing entirely | fully supported (owner-scoped RLS) | n/a | correctly scoped | not testable until UI exists |
| Cross-user isolation never directly tested | n/a | n/a | policies exist and were read/verified manually | anonymous-only, single identity per test run | believed correct by inspection | **zero automated verification with two distinct real identities** |
| No sign-out | missing entirely | missing entirely | n/a — session lives entirely client-side | by design, for now | n/a | n/a |
| Android system-bar overlap | cannot be seen by any tool used here | code looks structurally correct | n/a | n/a | n/a | explicitly disclosed as untestable by this project's tools |

---

## 12. Recommended Test Strategy (proposal only — nothing implemented)

- **Browser/UI (Playwright)** — keep as the system of record for real user journeys through the real UI against the real backend, exactly as the existing `e2e/journeys` suite already does. Extend it to cover the reps/RIR/description-length gaps in §6/§10 as failing-then-fixed regression scenarios, and to exercise the built-in tab bar's viewport-bound proxy check (already present) rather than the literal Android system-bar overlap (structurally out of reach for this tool).
- **API/database tests** — add a lightweight suite that talks to Supabase directly (as this session's E2E "Logic Agent" discussion aimed to, before being interrupted for this audit) using **two distinct real authenticated identities**, specifically to close the cross-user-isolation gap in §11 — this cannot be done meaningfully through the single-shared-test-user Playwright suite.
- **Logic/unit tests** — keep `packages/domain`'s pure-function suite as-is; it's fast, reliable, and appropriately scoped. Extend it whenever a new progression/validation rule is added, before it's wired into any screen.
- **Authentication/security tests** — since there's no credential-based auth today, "security testing" here means: (a) RLS policy verification with real distinct identities (see API/database, above), (b) confirming the `anon` role's read boundary matches §5's "public reference data only" model, and (c) confirming no service-role key or equivalent bypass is ever shipped client-side (already true today by inspection — worth a permanent static/lint-level check rather than a runtime test).
- **Repository/"integration" tests against the fake** — keep for fast feedback on mapping/shape logic, but do not rely on them for anything RLS- or constraint-related; they cannot catch those by construction.

---

## 13. Final Summary

**Architecture**: a Turborepo monorepo; the real product is an Expo/React Native app (`apps/mobile`) talking directly to Supabase (Postgres + Auth + RLS) with no custom backend API layer; business logic lives in a pure, dependency-free `packages/domain`.

**Authentication model**: fully automatic, invisible anonymous Supabase sign-in on first launch, persisted thereafter — there is no sign-up, sign-in, or sign-out UI, and no distinction between a "logged-out" and "logged-in" state from the user's perspective.

**Logged-out experience**: does not exist as a reachable state in the UI; at the API level, an unauthenticated request can read only the built-in catalogue and media assets.

**Logged-in experience**: the entire app — five-tab bottom navigation (Home, Workouts, Programmes, Exercises, Progress), programme/exercise/workout CRUD, workout logging, and a profile screen — all scoped to one anonymous identity per device.

**Major user journeys**: programme creation/editing, exercise creation, workout logging start-to-finish (with weight now a bounded stepper, other fields still free text), profile editing, and history/progress viewing are all implemented; onboarding, exercise/completed-workout editing/deletion, and sign-out do not exist.

**Database model**: a well-structured, consistently-shaped Postgres schema with CHECK constraints doing real validation work and RLS policies that, on inspection, correctly scope every user-owned table — no cross-user leak found by reading the policies, though this has never been verified by an automated test using two distinct real identities.

**Test coverage**: strong pure-logic unit coverage, reasonable component coverage, a fake-backed repository layer (not RLS/constraint-aware), and a genuinely real, currently-clean, 66-test Playwright E2E suite — with no database-level test suite and no automated cross-user-isolation check anywhere.

**Critical functional gaps**: silent failure on almost every write outside two fields fixed this session; unvalidated reps/RIR input; a shared `Stepper` component's stale-closure race affecting every numeric stepper except the newly-rewritten weight one; several CRUD operations the database supports but no screen exposes; no sign-out; and an untested (though believed-correct) cross-user RLS boundary.

**Recommended next testing steps**: (1) write the two-identity API/database suite to actually verify RLS isolation, since this is the single highest-value untested property in the whole app; (2) turn each identified input-validation gap into a currently-failing BDD scenario so its eventual fix is provable; (3) add a permanent regression test for the `Stepper` race across its other, still-unfixed usages; (4) decide, as a product question outside this audit's scope, whether custom-exercise/completed-workout editing and sign-out are intentionally deferred or accidentally missing.
