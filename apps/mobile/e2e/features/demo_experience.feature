Feature: Trying PrimeForm before creating an account
  In order to understand what PrimeForm looks like before committing to it
  As someone who has never used PrimeForm before
  I want to explore a realistic example of it without creating an account

  Rule: Anyone can enter the demo without creating an account

    Scenario: Entering the demo
      Given I have never used PrimeForm before
      When I choose to see a demo
      Then I see an example programme, workouts, and progress
      And it is clearly labelled as a demo

  Rule: The demo is not mine, and never becomes mine by looking at it

    Scenario: Leaving the demo without creating an account
      Given I am looking at the demo
      When I go back
      Then I am shown what PrimeForm does, not my training data
      And nothing from the demo is associated with me

  Rule: Someone who likes the demo programme can create an account and keep it

    @signupgap
    # "Create an account" only reaches the "Keep the demo programme?" screen
    # after signUpWithEmail() returns status "signed_in" — but this
    # project's Supabase has email confirmation enabled (see
    # lib/supabase/auth.ts's SignUpResult doc comment), so a real UI signup
    # always returns "confirmation_required" instead. Not reachable by an
    # automated run without a way to confirm a real email inline.
    Scenario: Choosing to use the demo programme
      Given I am looking at the demo
      When I create an account and choose to use this programme
      Then my new account follows the same programme the demo showed
      And none of the demo's example workouts or progress appear in my account

  Rule: Someone can create an account from the demo without keeping anything from it

    @signupgap
    # Same as "Choosing to use the demo programme" above — needs a signup
    # that actually completes with a session, which this project's enabled
    # email confirmation requirement blocks for an automated run.
    Scenario: Starting fresh instead of keeping the demo programme
      Given I am looking at the demo
      When I create an account and choose to start fresh
      Then my new account has no programme selected yet
      And none of the demo's example workouts or progress appear in my account
