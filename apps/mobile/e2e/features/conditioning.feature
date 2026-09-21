Feature: Logging conditioning and mobility work
  In order to keep a complete record of my training, not just strength work
  As someone using Silverfox
  I want to log cardio and mobility sessions separately from my strength workouts

  Rule: A person can log a cardio session

    Scenario: Logging a cardio session
      When I log a 30 minute running session
      Then my training record includes that running session

  Rule: A person can log a mobility session

    Scenario: Logging a mobility session
      When I log a 15 minute mobility session focused on hips
      Then my training record includes that mobility session
