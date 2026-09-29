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

    @emailDependency
    # "Create an account" from Demo always hits this project's real, enabled
    # email confirmation requirement (see lib/supabase/auth.ts's
    # SignUpResult doc comment), so "Keep the demo programme?" can only
    # genuinely appear once the person has confirmed their email and signed
    # in again — sometimes much later, possibly after closing the app
    # entirely. That intent is persisted on the account itself
    # (profiles.pending_demo_program_choice — see
    # providers/AuthProvider.tsx and supabase/migrations), not local state,
    # specifically so it survives that gap. e2e/steps/demo_experience.steps.ts
    # uses the Admin API only to stand in for clicking the emailed
    # confirmation link; every other step drives the real screens. The
    # signup form itself is submitted with a real, deliverable address
    # (Supabase's own signup validation rejects reserved domains outright)
    # and sends a real email, spending one slot of this project's shared
    # rate limit each run — excluded from the normal suite for that reason
    # (`pnpm run test:e2e:email` runs it explicitly).
    Scenario: Choosing to use the demo programme after confirming by email
      Given I am looking at the demo
      When I create an account from the demo
      Then I am asked to check my email to confirm my account
      When I confirm my email and sign in
      Then I am asked whether to keep the demo programme
      When I choose to use this programme
      Then my new account follows the same programme the demo showed
      And none of the demo's example workouts or progress appear in my account
      And I am not asked about the demo programme again

  Rule: Someone can create an account from the demo without keeping anything from it

    @emailDependency
    # Same real-signup/real-email reasoning as "Choosing to use the demo
    # programme after confirming by email" above.
    Scenario: Starting fresh instead of keeping the demo programme
      Given I am looking at the demo
      When I create an account from the demo
      And I confirm my email and sign in
      Then I am asked whether to keep the demo programme
      When I choose to start fresh
      Then my new account has no programme selected yet
      And none of the demo's example workouts or progress appear in my account
