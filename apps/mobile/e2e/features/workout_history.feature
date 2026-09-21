Feature: Reviewing workout history
  In order to see the training I have actually done
  As someone using Silverfox
  I want to look back at my finished workouts

  Rule: A finished workout appears in workout history

    Scenario: A finished workout appears in history
      Given I have finished a workout of "Push"
      When I look at my workout history
      Then I see that workout listed

    Scenario: Completed workout appears in history
      Given I have completed today's workout
      When I view my workout history
      Then the completed workout appears
      And its recorded sets match what I performed

  Rule: Changing my programme does not rewrite past workouts

    Scenario: Programme changes do not rewrite history
      Given I completed a workout using my previous programme
      When I later change the programme
      Then the historical workout still reflects what I actually performed

  Rule: An abandoned workout does not appear in workout history

    Scenario: A discarded workout is not recorded
      Given I discarded a workout of "Push" without finishing it
      When I look at my workout history
      Then I do not see that workout listed

  Rule: Workout history is still there after I leave and come back

    Scenario: Workout history survives returning to Silverfox
      Given I have finished a workout of "Push"
      When I close and reopen Silverfox
      Then I still see that workout in my history
