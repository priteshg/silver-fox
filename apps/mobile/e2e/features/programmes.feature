Feature: Following a training programme
  In order to know what training to do
  As someone using PrimeForm
  I want to choose and manage the training programme I follow

  Rule: A person can follow one of PrimeForm's built-in programmes

    Scenario: Choosing a built-in programme
      Given PrimeForm offers a built-in programme called "Foundation 40+"
      When I make "Foundation 40+" my programme
      Then "Foundation 40+" is the programme I am following

  Rule: A person can design and follow their own programme

    Scenario: Creating a programme
      Given I want to follow a programme of my own design
      When I create a programme called "Strength 3 Days" with 3 training days
      Then "Strength 3 Days" appears in my programme library
      And "Strength 3 Days" is the programme I am following

  Rule: A person can change the details of a programme they created

    Scenario: Renaming a programme I created
      Given I have a programme called "Strength 3 Days"
      When I rename it to "Strength and Size"
      Then my programme library shows "Strength and Size"

  Rule: A person can remove a programme they created

    # Deleting a programme is gated behind Alert.alert, a no-op on web (see
    # e2e/journeys/delete-workflows.spec.ts's KNOWN GAP tests) —
    # e2e/steps/programmes.steps.ts deletes the row directly via Supabase
    # instead of driving the confirm dialog, matching the technique used
    # elsewhere in this suite for Alert-gated actions.
    Scenario: Removing a programme I created
      Given I have a programme called "Strength 3 Days"
      When I remove "Strength 3 Days"
      Then it no longer appears in my programme library

  Rule: A built-in programme cannot be changed or removed by a person

    Scenario: Built-in programmes cannot be removed
      Given PrimeForm offers a built-in programme called "Foundation 40+"
      When I look at "Foundation 40+"
      Then I am not offered a way to remove it

  Rule: A programme must have a name

    Scenario: A programme cannot be created without a name
      Given I am creating a new programme
      When I leave the name blank
      Then I cannot create the programme

  Rule: A programme name has a maximum sensible length

    Scenario: A programme name cannot exceed 80 characters
      Given I am creating a new programme
      When I try to enter a name longer than 80 characters
      Then only the first 80 characters are accepted
