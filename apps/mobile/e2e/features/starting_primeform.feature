Feature: Starting PrimeForm
  In order to keep my training data as mine and separate from anyone else's
  As someone using PrimeForm
  I want a real account, and to be recognised automatically when I return

  Rule: Someone who has never used PrimeForm sees what it offers before doing anything else

    Scenario: First-ever visit to PrimeForm
      Given I have never used PrimeForm before
      When I start PrimeForm
      Then I see what PrimeForm does
      And I have not been signed into anything

  Rule: Creating an account is how someone starts using PrimeForm for real

    Scenario: Creating an account
      Given I have never used PrimeForm before
      When I create an account
      Then I can use the application
      And my training data belongs only to me

  Rule: Someone with an account can sign in on this device

    Scenario: Signing in
      Given I already have a PrimeForm account
      When I sign in
      Then I see my own training data

  Rule: A returning, already-signed-in person is recognised automatically

    Scenario: Returning to PrimeForm while still signed in
      Given I am signed in and have a programme called "Strength 3 Days"
      When I close and reopen PrimeForm
      Then I am still signed in
      And I still see "Strength 3 Days" in my programme library

  Rule: Signing out ends the session on this device

    Scenario: Signing out
      Given I am signed in
      When I sign out
      Then I am no longer signed in
      And I am shown what PrimeForm does, not my training data

  Rule: A session that has expired is treated the same as being signed out

    Scenario: Returning after a session has expired
      Given I was signed in, but my session has since expired
      When I open PrimeForm again
      Then I am shown what PrimeForm does, not my training data
      And I am not shown the example demo either

  Rule: PrimeForm tells me if it cannot be reached

    Scenario: PrimeForm cannot be reached
      Given PrimeForm cannot be reached right now
      When I start PrimeForm
      Then I am told PrimeForm could not connect
      And I am offered a way to try again
