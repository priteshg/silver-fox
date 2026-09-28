# Product Vision

PrimeForm is a premium fitness and nutrition application for people who take
their training seriously. It replaces spreadsheets, notes apps, and generic
fitness trackers with a fast, precise, and visually polished tool built
around the two things that actually drive results: consistent workout
logging and accurate nutrition tracking.

The product should feel closer to a well-made professional instrument than a
gamified consumer app — calm, confident, dark-first, with large legible
numbers and no unnecessary friction between deciding to log a set and having
it logged.

## Who it's for

Intermediate to advanced lifters who follow a structured program, care about
progressive overload, and want their training data to be accurate and easy
to review over time. Secondarily, anyone who wants to pair training with
deliberate high-protein nutrition.

## Initial feature areas

These describe the product surface, not the implementation. They are listed
in roughly the order the product should grow into them.

- **Workout programs** — create and structure training programs made of
  workout days, each with a planned list of exercises, target sets, rep
  ranges, and target RIR (reps in reserve).
- **Workout logging** — log actual sets against a planned or freestyle
  workout: weight, reps, sets, and RIR, with minimal taps per set.
- **Exercise library** — a browsable, high-quality library of exercises with
  AI-generated imagery, muscle group tagging, and enough detail to pick the
  right exercise quickly.
- **History and progression** — review past workouts and see progression
  over time (volume, estimated one-rep max, personal records) without
  needing to do the math by hand.
- **Nutrition and protein tracking** — track daily intake against personal
  calorie and protein targets.
- **High-protein recipe discovery** — browse and save recipes suited to the
  user's nutrition targets.
- **AI-assisted training and nutrition** — later-stage features that use the
  accumulated workout and nutrition history to suggest program adjustments,
  answer questions, and reduce planning effort.

## Product principles

- **Logging speed is a feature.** Every screen involved in recording a set
  during a workout is held to a higher bar for speed than any other part of
  the app.
- **Numbers should be trustworthy.** Progression, volume, and nutrition
  figures are only useful if the user trusts they are accurate.
- **Offline is the default assumption for logging.** A gym is an unreliable
  network environment; logging a workout must not depend on connectivity.
- **Premium, not gimmicky.** Visual polish serves clarity and confidence, not
  novelty. See [design-system.md](./design-system.md).
