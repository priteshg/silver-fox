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

    Scenario: Starting a workout while another is already in progress
      Given I am performing "Push"
      When I try to start "Pull" as well
      Then I am asked to confirm before "Push" is discarded

  Rule: An unfinished workout can be resumed after navigating away

    Scenario: Resuming a workout in progress
      Given I am performing "Push"
      When I close and reopen Silverfox
      Then I am offered a way to resume "Push"

  Rule: Finishing a workout records it as part of my training

    Scenario: Finishing a workout
      Given I am performing "Push"
      And I have completed a set of Bench Press
      When I finish my workout
      Then my workout history includes this workout

  Rule: A workout can be abandoned instead of finished, and is not recorded

    Scenario: Discarding a workout
      Given I am performing "Push"
      When I discard the workout
      Then my workout history does not include this workout
