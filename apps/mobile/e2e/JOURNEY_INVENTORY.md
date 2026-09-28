# PrimeForm — E2E Journey Inventory

Produced by direct inspection of `apps/mobile/app/**` (every route), the
repositories each screen calls, and the Postgres schema those repositories
write to (`supabase/migrations/`). This is the source of truth the Flow
Agent's specs are built from — not assumptions about what a fitness app
"usually" has.

## Important discovery: there is no traditional auth journey

The app has **no login, signup, or password-reset UI at all**. Every device
gets a Supabase anonymous session automatically on first launch
(`lib/supabase/auth.ts`), gated by `SessionGate` in `app/_layout.tsx`. The
closest analogue to "authentication and account journeys" in this app is:
session bootstrap (loading → ready), and the failure/retry path when
Supabase is unreachable or misconfigured. Both are covered under
`journeys/session-bootstrap.spec.ts`. There is no journey where a user
enters credentials, so no credential-based test cases apply.

## Routes (16 distinct patterns, 21 screen files)

| Route | Screen | Purpose |
|---|---|---|
| `/` | Home | Today's workout, week overview, quick stats, profile entry |
| `/workouts` | Workouts | Start today's session, log cardio/mobility, history |
| `/workouts/log-cardio` | Log Cardio | Form: type, duration, notes |
| `/workouts/log-mobility` | Log Mobility | Form: focus, duration, notes |
| `/programs` | Programme Library | Browse/filter catalogue + custom programmes |
| `/programs/new` | New Programme | Form: name, description, days/week, day names |
| `/programs/[programId]` | Programme Detail | View/edit programme, day tabs, add/remove day, add exercise |
| `/programs/[programId]/day/[dayId]/add-exercise` | Add Exercise (picker) | Search/filter exercise library, pick one |
| `/programs/[programId]/day/[dayId]/exercise/[programExerciseId]` | Configure Programme Exercise | Form: sets, rep range, RIR, rest (add when id="new", edit otherwise); remove |
| `/exercises` | Exercise Library | Search/filter, browse, create custom |
| `/exercises/new` | New Exercise | Form: name, muscle groups, equipment, description, instructions |
| `/exercises/[exerciseId]` | Exercise Detail | Coaching content, history chart, PRs |
| `/progress` | Progress | Tabs: Strength / Fitness / Physique / Consistency |
| `/profile` | Profile | Form: name, age, experience, goals, training days/week, equipment |
| `/workout/active` | Active Workout | Log sets, rest timer, finish/discard |
| `/workout/summary` | Workout Summary | Post-workout stats, PRs |

## Navigation elements

- Bottom tab bar (5 tabs: Home, Workouts, Programmes, Exercises, Progress) — present on all `(tabs)` routes.
- Stack back button (native header) on `/profile`, `/workout/summary`.
- In-screen back/cancel affordances: `Discard` (active workout), `Cancel` (edit forms).
- Deep, nested push navigation under Programmes (programme → day → exercise picker → exercise config), up to 4 levels deep.

## CRUD inventory

| Entity | Create | Read | Update | Delete | Owner-scoped? |
|---|---|---|---|---|---|
| Programme | `/programs/new` | `/programs`, `/programs/[id]` | Edit Details on detail screen | Delete (custom only, list screen) | Yes — built-in catalogue is read-only |
| Programme day | "+ Add Day" | day tabs | rename (not currently exposed in UI, repository supports it) | "Remove day" | Yes, via parent programme |
| Programme exercise | Add Exercise flow | day exercise list | Configure screen (sets/reps/RIR/rest) | Remove From Day | Yes, via parent programme |
| Custom exercise | `/exercises/new` | `/exercises`, `/exercises/[id]` | *(no edit UI exists)* | *(no delete UI exists)* | Yes |
| Workout (session) | Start from a programme day | history (Workouts tab), summary | *(no edit-after-finish UI)* | Discard (only while in progress, before finish) | Yes |
| Workout set | logged in active workout | shown as "Last time" | *(only while un-completed, before Log tap)* | Remove (only while un-completed) | Yes, via workout |
| Profile | auto-created on sign-in | `/profile` | `/profile` Save | N/A | Yes (own row only) |
| Conditioning/mobility session | log screens | Progress → Fitness tab | *(no edit UI)* | *(no delete UI)* | Yes |

**Findings from this table alone** (before running anything): custom
exercises have no edit or delete path once created — only a create form
exists. A finished workout cannot be edited or deleted. These are product
gaps worth flagging even though they're "working as built" rather than bugs.

## All user-editable inputs, by intended type

| Field | Screen | Control | DB constraint (source of truth) |
|---|---|---|---|
| Programme name | New/Edit Programme | free-text `TextInput`, no `maxLength` | `char_length(name) between 1 and 80` |
| Programme description | New/Edit Programme | free-text, multiline, no `maxLength` | `char_length(description) <= 500`, nullable |
| Day name(s) | New Programme, Add Day | free-text, no `maxLength` | `char_length(name) between 1 and 80` |
| Exercise name | New Exercise | free-text, no `maxLength` | `char_length(name) between 1 and 120` |
| Exercise description | New Exercise | free-text, multiline, no `maxLength` | `char_length(description) <= 500` |
| Weight (kg) | Active Workout set row | free-text `keyboardType="decimal-pad"`, **no format validation beyond non-empty** | `numeric not null check (weight >= 0)` |
| Reps | Active Workout set row | free-text `keyboardType="decimal-pad"`, **no format validation beyond non-empty** | `integer not null check (reps >= 0)` |
| RIR | Active Workout set row | free-text, optional, **no format validation** | `numeric check (rir between 0 and 10)`, nullable |
| Target sets/rep range/RIR/rest | Configure Programme Exercise | `Stepper` (+/- buttons only — **not** free text) | various CHECKs, all `>0`/ranged |
| Age | Profile | free-text `keyboardType="number-pad"` | `smallint check (age between 13 and 120)` |
| Preferred training days/week | Profile | `Stepper`, min 1 max 7 | `smallint check (... between 1 and 7)` |
| Cardio/mobility duration | Log Cardio/Mobility | `Stepper` (button-only) | `numeric not null check (duration_minutes > 0)` |
| Notes | Log Cardio/Mobility | free-text, multiline, no `maxLength` | `char_length(notes) <= 500` |

**Immediate implication**: every `Stepper`-based field is inherently safe
from malformed/injection input (it's buttons, not a text box) — fuzzing
effort belongs on the free-text fields above, especially **weight, reps,
RIR, and every name/description field**, since those are the only fields
where a user (or a pasted value) can enter arbitrary text.

**Systemic risk found before running any test** (confirmed live below):
no screen in the app catches errors from a repository call except the root
`SessionGate`. Every Save/Create/Log button's handler has no `try/catch` —
if Postgres rejects a write (e.g. a 500-character programme name, or a
weight that serialized to `null` because the input was non-numeric), the
failure is an unhandled promise rejection with **no user-visible error
message**. This is the single highest-value thing for this suite to verify.

## Journeys tested (see `e2e/journeys/*.spec.ts` for the executable form)

1. Session bootstrap (ready / misconfigured / retry)
2. Programme CRUD — create, view, edit, add/remove day, delete
3. Programme name/description input validation (boundary + security payloads)
4. Exercise library — browse, filter, search, create custom, name validation
5. Add exercise to a programme day, configure sets/reps/RIR/rest
6. Start a workout from a programme day
7. Set logging — weight/reps/RIR fuzzing (boundary, malformed, security), individual set completion, previous-performance display
8. Progressive overload suggestion — display and tap-to-apply
9. Finish/discard a workout, workout summary
10. Workout history persistence
11. Profile CRUD — including age boundary testing
12. Navigation — all 5 tabs, deep-link back navigation, browser back button, refresh mid-flow
13. Empty states — no workouts yet, no exercises match filter, custom programme with no days worth of exercises
14. Persistence-after-refresh for every entity created above
15. Mobile viewport — bottom nav stays within viewport across all 5 tabs, no content clipped behind it

## Known, disclosed limitations of this suite

- **Android system-bar overlap cannot be verified by any browser-based
  tool**, Playwright included — that requires real OS chrome (a physical
  device or an Android emulator), which is a different testing modality
  entirely. This was verified separately, manually, on the user's own
  device earlier in this project. This suite instead verifies the browser
  proxy for it: the tab bar's bounding box stays fully within the viewport
  and page content is never rendered underneath it.
- Every anonymous test run creates one real `auth.users` row in the
  connected Supabase project (there's no way to delete an auth user with
  only the anon key — that needs the service role key, which this suite
  correctly never touches). Each spec cleans up the *data* it creates
  (programmes, exercises, workouts), but the empty auth user + profile row
  it leaves behind is a known, accepted cost of testing against a real
  backend rather than a dedicated disposable test project.
