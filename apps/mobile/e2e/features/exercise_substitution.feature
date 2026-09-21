Feature: Substituting an exercise during a workout
  In order to keep training when the exercise a programme calls for isn't possible
  As someone performing a workout
  I want to swap in a genuinely similar alternative

  Rule: A person can find a suitable alternative when equipment isn't available

    Scenario: Substitute an unavailable exercise
      Given today's workout contains Bench Press
      When I choose to substitute the exercise
      Then Silverfox shows suitable alternatives

    Scenario: Home equipment limits which alternatives are shown
      Given I am training at home
      And I only have dumbbells available
      When I request an alternative to Bench Press
      Then Silverfox only recommends alternatives that use dumbbells or bodyweight

    Scenario: No suitable alternative exists
      Given I only have equipment that trains a different muscle group entirely
      When I request an alternative to Bench Press
      Then Silverfox tells me no suitable alternative was found

  Rule: Substitution preserves the programme

    Scenario: Substitution preserves the programme
      Given my programme contains Bench Press
      When I substitute it with Dumbbell Bench Press during a workout
      Then today's workout uses Dumbbell Bench Press
      And my programme still contains Bench Press

  Rule: The workout records what was actually performed

    Scenario: Substitution records what actually happened
      Given I substituted Bench Press with Dumbbell Bench Press
      When I complete the workout
      Then my workout history records Dumbbell Bench Press

  Rule: A substitution can be reconsidered before any work is logged

    Scenario: Cancelling a substitution changes nothing
      Given today's workout contains Bench Press
      When I open the substitute screen and cancel
      Then today's workout still contains Bench Press

    Scenario: A substitution can be swapped again before logging a set
      Given I substituted Bench Press with Dumbbell Bench Press
      And I have not logged any set yet
      When I substitute again with Push-Up
      Then today's workout uses Push-Up

  Rule: A substitution cannot be made once work has been logged for that exercise

    Scenario: Substitution is unavailable after a set is logged
      Given I have logged a completed set of Bench Press today
      Then I am not offered a way to substitute that exercise
