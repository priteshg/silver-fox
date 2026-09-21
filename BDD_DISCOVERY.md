# Silverfox — BDD Discovery

This is a discovery document, not a specification. It exists to answer one question before any Gherkin is written: **what behaviour does Silverfox actually provide today, and what business rule does each behaviour represent?**

It is derived from the same audit as `CURRENT_STATE.md`, re-read through a behavioural lens: every technical fact in that document (a column type, an RLS policy, a component) has been asked "what does a person actually experience because of this?" Where the answer is a real rule, it's recorded below. Where the code doesn't tell us what was *intended*, that's recorded as a question, not resolved by guessing.

---

## DOMAIN

### Actors

- **Person using Silverfox** — the only actor found. Silverfox is single-user per session; there is no coach, trainer, administrator, or second human role anywhere in the implementation.
- No other actor was found. There is no concept of a "team," "gym," or "shared programme between people" anywhere in the code or schema.

### Domain concepts

- **Session** — the thing that makes a person's data theirs, established automatically rather than through credentials. (Not called "account" or "login" anywhere in the product — see the Known Questions under Session below.)
- **Programme** — a training plan a person follows, either one Silverfox provides ("built-in") or one a person designs themselves ("custom"). Made up of Programme Days.
- **Programme Day** — a named training day within a programme (e.g. "Push"), made up of a list of exercises with targets.
- **Exercise** — a movement (e.g. "Bench Press"), either from Silverfox's shared library or created by a person for themselves.
- **Programme Exercise** — an exercise as it appears within a specific Programme Day: its target number of sets, target rep range, and (optionally) target effort and rest.
- **Workout** — a single occasion of actually performing a Programme Day. Has a beginning (started) and, if completed, an end (finished). Can also be abandoned.
- **Set** — one completed unit of work within a workout: an exercise, a weight, a number of repetitions, and optionally how many repetitions were left in reserve.
- **Workout History** — the record of a person's finished workouts, kept indefinitely.
- **Progress** — a summary, derived from Workout History, of how a person's training is trending (streaks, volume, personal records).
- **Conditioning Session** / **Mobility Session** — a logged cardio or mobility activity, tracked alongside but separately from strength workouts.
- **Profile** — a person's own details about themselves (name, age, training experience, goals, equipment, preferred training frequency).

---

## BUSINESS RULES

Grouped by domain concept. Each rule states what Silverfox actually does today, evidenced by the code, not what it should do.

### Session

**Rule: A session is established automatically the first time Silverfox is used.**
Why it matters: a person's programmes, exercises, and workouts need something to belong to, without requiring them to create a traditional account before they can start training.
Examples: opening Silverfox for the first time on a device silently establishes a session and the person lands directly on their (empty) home view.
Known questions: is "no credentials, ever" a deliberate, permanent product decision, or a placeholder until real accounts exist? There is no product document found that says either way. There is no way to move a session's data to a different device, and no way to end a session — is that intentional (a session is permanent and tied to the device) or a missing feature?

**Rule: A returning person's session, and everything in it, is restored automatically.**
Why it matters: training data would be worthless if it disappeared between uses.
Examples: closing and reopening Silverfox shows the same programmes, exercises, and history as before.
Known questions: none — this is unambiguous and consistently implemented.

**Rule: Silverfox tells a person if their session cannot be established, and lets them retry.**
Why it matters: a silent failure to connect would leave a person staring at a broken app with no explanation.
Examples: if Silverfox cannot connect, a person sees a message that it couldn't connect, with a way to try again.
Known questions: none for this specific path — it is the one place in the whole application with a genuine, deliberate error-handling UI (see the "systemic gap" note under Cross-Cutting Concerns, below, for contrast).

### Data privacy

**Rule: A person's programmes, exercises, and workouts belong only to their own session.**
Why it matters: training data is personal; a person doing this for themselves should never see, or risk exposing, someone else's data.
Examples: two people using Silverfox independently never see each other's custom programmes or workout history.
Known questions: none about intent — this is clearly the design (enforced at every level the code touches). It has never been verified by an automated test using two genuinely separate sessions (see `CURRENT_STATE.md` §9/§11).

### Programme

**Rule: A person can choose one of Silverfox's built-in programmes to follow.**
Why it matters: not everyone wants to design their own plan; a ready-made one lowers the barrier to starting.
Examples: choosing "Foundation 40+" makes it the programme a person follows.

**Rule: A person can design and follow their own programme.**
Why it matters: some people have a specific plan in mind that no built-in programme matches.
Examples: creating a programme called "Strength 3 Days" with 3 training days makes it available to follow.

**Rule: A person can change the details of a programme they created.**
Why it matters: plans change as training progresses.
Examples: renaming "Strength 3 Days" to "Strength and Size."

**Rule: A person can remove a programme they created.**
Why it matters: a programme that's no longer wanted shouldn't clutter the person's library forever.
Examples: removing "Strength 3 Days" removes it from the library.
Known questions: removing a programme currently has no confirmation step observed to work (see Cross-Cutting Concerns — this is a testability gap, not necessarily a product gap, since a confirmation *is* attempted by the code; it just doesn't function on every platform this was checked on).

**Rule: A built-in programme cannot be changed or removed by a person.**
Why it matters: built-in programmes are Silverfox's own content, shared by everyone — one person changing or deleting it would break it for everyone, or make no sense since it isn't theirs.
Examples: looking at "Foundation 40+" offers no way to remove or directly rename it.

**Rule: A programme must have a name.**
Why it matters: an unnamed plan isn't something a person could recognise or choose later.
Examples: trying to create a programme with no name is not possible.

**Rule: A programme name has a maximum sensible length.**
Why it matters: an unbounded name would break how programmes are displayed and compared.
Examples: today, Silverfox stops accepting further characters once a programme name reaches 80 characters.
Known questions: is 80 characters itself a meaningful product decision, or an arbitrary current limit? No product rationale was found — only the limit's existence and current enforcement are established facts.

### Programme Day

**Rule: A programme is made up of one or more named training days, each with its own exercises.**
Why it matters: most training plans are structured around specific days (e.g. "Push," "Pull," "Legs"), not one undifferentiated list.
Examples: "Strength 3 Days" has days named "Push," "Pull," and "Legs."

**Rule: A training day with no exercises cannot be started.**
Why it matters: there's nothing to actually do — starting it would produce an empty, meaningless workout.
Examples: a day with no exercises added yet offers no way to start it.

### Exercise

**Rule: A person can find exercises in Silverfox's shared library.**
Why it matters: most people don't want to define "Bench Press" from scratch — reference content should exist and be searchable.
Examples: searching the library for "squat" finds "Barbell Squat."

**Rule: A search that matches nothing is shown clearly, not left blank.**
Why it matters: an empty screen with no explanation looks broken; a "no matches" message tells a person their search worked as expected.
Examples: searching for an exercise that doesn't exist shows a message saying so, not a blank list.

**Rule: A person can add their own exercise to their library.**
Why it matters: Silverfox's shared library won't cover every possible exercise a person wants to train.
Examples: adding "Reverse Nordic Curl" makes it appear in the person's own exercise library alongside the shared ones.

**Rule: An exercise must have a name.**
Why it matters: same reasoning as a programme's name — it must be identifiable.
Examples: trying to save a new exercise with no name is not possible.

**Rule: An exercise name has a maximum sensible length.**
Why it matters: same reasoning as a programme name.
Examples: today, Silverfox stops accepting further characters once an exercise name reaches 120 characters.
Known questions: same as the programme name limit — the number's own rationale is not documented anywhere found.

**Rule (current limitation, not confirmed as intended): once created, a custom exercise cannot currently be changed or removed by its owner.**
Why it matters: recorded here because it's a striking asymmetry (programmes *can* be edited/removed; exercises currently cannot) worth a product decision, not because it's confirmed as the intended rule.
Known questions: is this a deliberate simplification (exercises are meant to be lightweight and rarely wrong) or a missing feature? No evidence either way was found. Not written into the feature files as a rule — see `CURRENT_STATE.md` §8/§11.

### Programme Exercise

**Rule: Each exercise within a training day has a target number of sets and a target rep range.**
Why it matters: this is the actual instruction a person follows when they get to that exercise — without it, "do Bench Press" is meaningless.
Examples: "Bench Press" in "Push" has a target of 4 sets of 6 to 10 reps.

**Rule: A person can change the target sets/reps for an exercise already in a day.**
Why it matters: targets should evolve as a person's training progresses.
Examples: changing "Bench Press"'s target from 6–10 reps to 8–10 reps.

**Rule: A person can remove an exercise from a training day.**
Why it matters: a plan should be adjustable, not fixed forever once built.
Examples: removing "Bench Press" from "Push."

**Rule (unclear whether intended): an exercise's target rep range is silently corrected rather than rejected if entered the wrong way round.**
Why it matters: recorded because the current code visibly computes `max(low, high)` rather than stopping the person or explaining anything — worth a product decision.
Known questions: should this instead be prevented outright with an explanation, given Silverfox already prevents some other invalid configurations (e.g. a day with no exercises)? Not answered by the code.

### Workout

**Rule: A person starts a workout from one of their programme's training days.**
Why it matters: a workout only makes sense in the context of a specific planned day.
Examples: starting "Push" begins a workout of that day's exercises.

**Rule: Finishing a workout records it as part of the person's training.**
Why it matters: the whole point of doing a workout is for it to count.
Examples: finishing a workout of "Push" adds it to workout history.

**Rule: A workout can be abandoned instead of finished, and an abandoned workout is not recorded.**
Why it matters: sometimes a session gets cut short and shouldn't count as if it happened.
Examples: discarding a workout of "Push" means it never appears in history.

### Set

**Rule: A completed set records the weight and repetitions performed for one exercise.**
Why it matters: this is the actual unit of training data everything else (history, progress, personal records) is built from.
Examples: recording 80 kg for 8 repetitions on Bench Press completes that set with those values.

**Rule: A set cannot be completed without recording repetitions.**
Why it matters: "how many" is the minimum information a completed set needs to mean anything.
Examples: trying to complete a set with no repetitions recorded does not complete it.

**Rule: Weight starts at a sensible default and changes only in whole-kilogram steps.**
Why it matters: this reflects how weight actually works in a gym — you add or remove a fixed increment of load, you don't type an arbitrary number.
Examples: weight begins at 20 kg for a new set; increasing it twice adds 2 kg in total.
Known questions: is 20 kg specifically meaningful (e.g. an empty barbell), or just a reasonable placeholder? Not documented, but it is a real, current, concrete starting value.

**Rule: Weight cannot be reduced below zero.**
Why it matters: a negative amount of weight has no physical meaning.
Examples: from 0 kg, trying to decrease further leaves it at 0 kg.

**Rule: A person may optionally record how many repetitions they had in reserve.**
Why it matters: effort matters as much as the raw numbers for understanding how hard a set actually was.
Examples: recording 80 kg for 8 repetitions with 2 repetitions in reserve keeps that effort value with the set.

**Rule: A completed set can be corrected before the workout is finished.**
Why it matters: mistakes happen — a person should be able to fix a set they logged wrong, right up until the workout is done.
Examples: undoing a completed set returns it to an editable, uncompleted state; an uncompleted set can be removed entirely.

### Workout History

**Rule: A finished workout appears in workout history.**
Why it matters: this is the entire purpose of finishing a workout — it should be recorded somewhere the person can see it again.

**Rule: An abandoned workout never appears in workout history.**
Why it matters: it never actually happened, in the sense that counts for training records.

**Rule: Workout history persists across visits to Silverfox.**
Why it matters: training history that vanished between sessions would be worthless.

### Progress

**Rule: Progress reflects only the training a person has actually finished and recorded.**
Why it matters: a summary built from abandoned or incomplete workouts would misrepresent how much training actually happened.
Examples: a finished workout is reflected in progress; a discarded one is not.
Known questions: does anything in a person's Profile (age, experience, goals) currently influence what Progress shows or recommends? No evidence of this connection was found anywhere in the code — Progress appears to be computed purely from Workout History. Recorded as unresolved rather than assumed either way.

### Conditioning / Mobility

**Rule: A person can log cardio activity separately from strength training.**
Why it matters: not all training is a "workout" in the sets-and-reps sense; cardio still needs to be tracked.
Examples: logging a 30-minute running session adds it to the person's training record.

**Rule: A person can log mobility work separately from strength training.**
Why it matters: same reasoning as cardio.
Examples: logging a 15-minute hip-mobility session adds it to the training record.

### Profile

**Rule: A person can record and update personal training details about themselves.**
Why it matters: this is a person's own information about who they are as a trainee.
Examples: setting training experience to "intermediate."

**Rule: Age must fall within a realistic human range.**
Why it matters: an age outside any plausible human lifespan would be a data-entry mistake, not a real value.
Examples: today, an age of 13 or 120 is accepted; 12 or 121 is not.
Known questions: **this rule is currently enforced with no visible explanation to the person when it's violated** — see Cross-Cutting Concerns below. Recorded as a current-behaviour gap, not turned into a "and I am told why" scenario, because that part isn't true today.

---

## CROSS-CUTTING CONCERNS (not features in themselves, but affect several rules above)

- **Silent failure on invalid input, almost everywhere.** Outside session establishment and (following a fix made during this audit) programme/exercise naming, no screen in Silverfox currently tells a person *why* something they tried to save didn't work — it simply doesn't happen, with no explanation. This affects the Age rule above directly, and is a candidate to affect any other rule where a limit exists but no message does. Recorded once here rather than repeated under every affected rule.
- **Repetitions and reps-in-reserve currently accept values with no format checking** (a person could type letters or a decimal into either field) — there is no established product rule for what should happen in that case, only what currently happens (nothing stops it, and the outcome after that point is undefined/inconsistent). Not written into the feature files as either an "accepted" or "rejected" scenario, because neither is a confirmed rule — see `BDD_SPECIFICATION.md`'s Current Behaviour Gaps section.
- **Deleting a programme or exercise (where the UI even offers it) could not be verified to complete successfully in every environment tested** during this project — a confirmation step appears to be intended but did not consistently function. This is a testability/implementation concern, not a business rule, and is not represented in the Gherkin.

---

## UNKNOWN / UNDECIDED

Recorded here rather than resolved by assumption, per the instruction not to invent answers:

1. Is "no credentials, no accounts, no sign-out" a permanent product decision for Silverfox, or a temporary MVP simplification?
2. Should a session ever be transferable between devices, or is one session permanently tied to one device by design?
3. What should happen if a person enters an invalid age, name-too-long value (before the recent fix), or other rejected input — should Silverfox always explain why, and if so, how (inline message, summary, something else)? The one existing example of this being done well (session-connection failure) could be the model, but nothing establishes that as policy.
4. Should repetitions and reps-in-reserve have the same kind of structural protection newly given to weight (a bounded, incrementing control) or a different kind of validation (a text field with an explicit error)? Both are plausible; nothing in the code indicates which was intended.
5. Should a custom exercise be editable/removable, matching what's possible for a custom programme? Nothing suggests this was a deliberate asymmetry versus an oversight.
6. Does anything about a person's Profile currently, or is it intended to, influence programme recommendations or progression? No connection was found in the code as it stands.
7. Is the specific 80-character (programme) / 120-character (exercise) name limit a meaningful design decision or an arbitrary current value?
8. What is the intended behaviour when a target rep range is entered "backwards" (low above high)? Silently correcting it is what happens today; whether that's desired or should instead be prevented with an explanation is unresolved.
