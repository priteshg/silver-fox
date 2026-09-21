Feature: Configuring exercises within a training day
  In order to follow a specific plan for each exercise
  As someone building or adjusting my programme
  I want to set what I aim to do on each exercise

  Rule: Each exercise in a training day has a target number of sets and a rep range

    Scenario: Adding an exercise to a training day
      Given I have a programme called "Strength 3 Days" with a day called "Push"
      When I add "Bench Press" to "Push" aiming for 4 sets of 6 to 10 repetitions
      Then "Push" includes "Bench Press" with a target of 4 sets of 6 to 10 repetitions

  Rule: A person can change the target for an exercise already in a day

    Scenario: Adjusting the target repetitions for an exercise
      Given "Push" includes "Bench Press" with a target of 4 sets of 6 to 10 repetitions
      When I change the target to 8 to 10 repetitions
      Then "Push" shows "Bench Press" with a target of 4 sets of 8 to 10 repetitions

  Rule: A person can remove an exercise from a training day

    Scenario: Removing an exercise from a training day
      Given "Push" includes "Bench Press"
      When I remove "Bench Press" from "Push"
      Then "Push" no longer includes "Bench Press"

  Rule: A person can change the order exercises appear in within a training day

    Scenario: Reordering an exercise within a training day
      Given "Push" lists "Bench Press" before "Overhead Press"
      When I move "Overhead Press" earlier in "Push"
      Then "Push" lists "Overhead Press" before "Bench Press"
