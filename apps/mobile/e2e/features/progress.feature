Feature: Tracking training progress
  In order to see whether my training is working
  As someone following a training programme
  I want PrimeForm to summarise my progress over time

  Rule: Progress reflects only the training I have actually finished

    Scenario: A finished workout counts toward progress
      Given I have finished a workout including a completed set of Bench Press
      When I look at my progress
      Then that workout is reflected in my progress

    Scenario: An abandoned workout does not count toward progress
      Given I discarded a workout without finishing it
      When I look at my progress
      Then that workout is not reflected in my progress

  Rule: A new best result is recognised as a personal record

    # "When I finish a workout" literally means tapping Finish workout,
    # which is gated behind Alert.alert (a no-op on react-native-web — see
    # e2e/journeys/delete-workflows.spec.ts's KNOWN GAP tests) and so can't
    # be driven through the real button on web. e2e/steps/progress.steps.ts
    # instead seeds the same end state a genuine finish produces (a
    # completed workout + set) directly via Supabase, the same technique
    # already used for this file's other "Given ... finished ..." steps —
    # this verifies the PR-detection logic honestly, just not the literal
    # tap-the-button mechanics of reaching it (that gap is already
    # documented elsewhere and isn't re-litigated here).
    Scenario: Setting a new personal record
      Given my best recorded set of Bench Press is 80 kg for 8 repetitions
      When I finish a workout with 85 kg for 8 repetitions of Bench Press
      Then that set is recognised as a new personal record for Bench Press
