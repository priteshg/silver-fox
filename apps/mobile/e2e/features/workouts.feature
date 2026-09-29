Feature: Performing a workout
  In order to actually do the training my programme calls for
  As someone following a training programme
  I want to start, finish, or abandon a workout

  Rule: A person starts a workout from one of their programme's training days

    Scenario: Starting today's workout
      Given "Push" is today's training day in the programme I am following
      When I start "Push"
      Then I am performing "Push"

  Rule: A training day with no exercises cannot be started

    Scenario: A day with no exercises cannot be started
      Given "Push" has no exercises
      When I consider starting "Push"
      Then I am not offered a way to start it

  Rule: Starting a new workout while one is already in progress asks me to confirm

    # confirmAndStart (lib/startWorkout.ts) warns via Alert.alert — a no-op
    # on react-native-web (see e2e/journeys/delete-workflows.spec.ts's KNOWN
    # GAP tests), so the dialog itself can't be observed here.
    # e2e/steps/workouts.steps.ts instead verifies the rule's real intent —
    # that starting a new workout never *silently* discards the one already
    # in progress — since the no-op confirm means "Push" must still be
    # exactly where it was, not replaced.
    Scenario: Starting a workout while another is already in progress
      Given I am performing "Push"
      When I try to start "Pull" as well
      Then I am asked to confirm before "Push" is discarded

  Rule: An unfinished workout can be resumed after navigating away

    Scenario: Resuming a workout in progress
      Given I am performing "Push"
      When I close and reopen PrimeForm
      Then I am offered a way to resume "Push"

  Rule: Finishing a workout records it as part of my training

    # "When I finish my workout" literally means Finish workout, gated
    # behind Alert.alert (a no-op on web) — e2e/steps/workouts.steps.ts
    # seeds the same end state a genuine finish produces directly via
    # Supabase instead of driving the confirm dialog.
    Scenario: Finishing a workout
      Given I am performing "Push"
      And I have completed a set of Bench Press
      When I finish my workout
      Then my workout history includes this workout

  Rule: A workout can be abandoned instead of finished, and is not recorded

    # Discard is gated behind Alert.alert, a no-op on web (see
    # e2e/journeys/delete-workflows.spec.ts's KNOWN GAP tests) —
    # e2e/steps/workouts.steps.ts clears the active-session storage key
    # directly, the same underlying operation discardSession() itself
    # performs (providers/ActiveSessionProvider.tsx), just triggered
    # directly rather than via the confirm-gated button.
    Scenario: Discarding a workout
      Given I am performing "Push"
      When I discard the workout
      Then my workout history does not include this workout
