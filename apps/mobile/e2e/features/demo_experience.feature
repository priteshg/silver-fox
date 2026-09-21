Feature: Trying Silverfox before creating an account
  In order to understand what Silverfox looks like before committing to it
  As someone who has never used Silverfox before
  I want to explore a realistic example of it without creating an account

  Rule: Anyone can enter the demo without creating an account

    Scenario: Entering the demo
      Given I have never used Silverfox before
      When I choose to see a demo
      Then I see an example programme, workouts, and progress
      And it is clearly labelled as a demo

  Rule: The demo is not mine, and never becomes mine by looking at it

    Scenario: Leaving the demo without creating an account
      Given I am looking at the demo
      When I go back
      Then I am shown what Silverfox does, not my training data
      And nothing from the demo is associated with me

  Rule: Someone who likes the demo programme can create an account and keep it

    Scenario: Choosing to use the demo programme
      Given I am looking at the demo
      When I create an account and choose to use this programme
      Then my new account follows the same programme the demo showed
      And none of the demo's example workouts or progress appear in my account

  Rule: Someone can create an account from the demo without keeping anything from it

    Scenario: Starting fresh instead of keeping the demo programme
      Given I am looking at the demo
      When I create an account and choose to start fresh
      Then my new account has no programme selected yet
      And none of the demo's example workouts or progress appear in my account
