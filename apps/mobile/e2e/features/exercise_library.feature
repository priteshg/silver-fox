Feature: Building an exercise library
  In order to have the exercises I need available to train with
  As someone using PrimeForm
  I want to browse PrimeForm's exercises and add my own

  Rule: A person can find an exercise by searching the library

    Scenario: Finding an exercise by name
      Given PrimeForm's exercise library includes "Barbell Squat"
      When I search the exercise library for "squat"
      Then "Barbell Squat" appears in the results

  Rule: A search with no matching exercises is shown clearly, not left blank

    Scenario: Searching for an exercise that does not exist
      Given PrimeForm's exercise library does not include an exercise called "Zzyzx Curl"
      When I search the exercise library for "Zzyzx Curl"
      Then I am told no exercises match my search

  Rule: A person can add their own exercise to the library

    Scenario: Adding a custom exercise
      Given I want to train an exercise not in PrimeForm's library
      When I add an exercise called "Reverse Nordic Curl"
      Then "Reverse Nordic Curl" appears in my exercise library

  Rule: An exercise must have a name

    Scenario: A custom exercise cannot be created without a name
      Given I am creating a new exercise
      When I leave the name blank
      Then I cannot save the exercise

  Rule: An exercise name has a maximum sensible length

    Scenario: An exercise name cannot exceed 120 characters
      Given I am creating a new exercise
      When I try to enter a name longer than 120 characters
      Then only the first 120 characters are accepted
