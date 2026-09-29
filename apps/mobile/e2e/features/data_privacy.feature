Feature: Keeping training data private
  In order to trust PrimeForm with my training data
  As someone using PrimeForm
  I want my programmes and workouts to be visible only to me

  Rule: A person's programmes are private to their own session

    Scenario: Programmes are not shared between sessions
      Given one person has created a programme called "E2E Privacy Test Programme"
      And another person has their own PrimeForm session
      When the second person looks at their programme library
      Then they do not see "E2E Privacy Test Programme"

  Rule: A person's workout history is private to their own session

    Scenario: Workout history is not shared between sessions
      Given one person has finished a workout
      And another person has their own PrimeForm session
      When the second person looks at their workout history
      Then they do not see the first person's workout
