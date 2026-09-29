Feature: Recording workout sets
  In order to keep an accurate record of my training
  As someone following a training programme
  I want to record the work I perform on each exercise

  Rule: A person can see what they did last time while recording a new set

    Scenario: Seeing previous performance while recording a set
      Given I recorded 75 kg for 8 repetitions of Bench Press last time
      When I start recording a new set of Bench Press
      Then I can see that I recorded 75 kg for 8 repetitions last time

  Rule: A completed set records the weight and repetitions performed

    Scenario: Recording a completed set
      Given I am performing today's workout
      And I am performing Bench Press
      When I record 80 kg for 8 repetitions
      Then my workout records a completed set of 80 kg for 8 repetitions

  Rule: A set cannot be completed without recording repetitions

    Scenario: Attempting to complete a set without repetitions
      Given I am performing today's workout
      And I am performing Bench Press
      When I try to complete a set without recording repetitions
      Then the set is not completed

  Rule: Weight starts at a sensible default and changes only in whole-kilogram steps

    @specmismatch
    # The weight stepper's real step size is 0.5kg (components/SetRow.tsx's
    # WEIGHT_STEP_KG, confirmed by e2e/journeys/workout-logging.spec.ts's
    # existing passing test), not the 1kg this scenario's numbers assume —
    # two clicks moves the total by 1kg, not 2kg. Left undefined rather than
    # given a step that would either misreport the real step size or
    # silently use different numbers than the ones written here.
    Scenario: Adjusting weight in fixed steps
      Given I am recording a set for Bench Press
      When I increase the weight twice
      Then the weight has increased by 2 kg in total

  Rule: Weight cannot be reduced below zero

    Scenario: Weight cannot go negative
      Given I am recording a set with a weight of 0 kg
      When I try to decrease the weight further
      Then the weight remains 0 kg

  Rule: A person may optionally record how many repetitions they had in reserve

    Scenario: Recording reps in reserve
      Given I am performing today's workout
      And I am performing Bench Press
      When I record 80 kg for 8 repetitions with 2 repetitions in reserve
      Then my workout records 2 repetitions in reserve for that set

  Rule: A completed set can be corrected before the workout is finished

    Scenario: Undoing a completed set
      Given I have completed a set of 80 kg for 8 repetitions
      When I undo that set
      Then the set is no longer marked complete

    Scenario: Removing a set before finishing
      Given I am performing today's workout
      And I have an uncompleted set for Bench Press
      When I remove that set
      Then Bench Press no longer has that set
