Feature: Keeping training data private
  In order to trust Silverfox with my training data
  As someone using Silverfox
  I want my programmes and workouts to be visible only to me

  Rule: A person's programmes are private to their own session

    Scenario: Programmes are not shared between sessions
      Given one person has created a programme called "Strength 3 Days"
      And another person has their own Silverfox session
      When the second person looks at their programme library
      Then they do not see "Strength 3 Days"

  Rule: A person's workout history is private to their own session

    Scenario: Workout history is not shared between sessions
      Given one person has finished a workout
      And another person has their own Silverfox session
      When the second person looks at their workout history
      Then they do not see the first person's workout
