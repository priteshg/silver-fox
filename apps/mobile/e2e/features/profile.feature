Feature: Maintaining a personal profile
  In order to have Silverfox reflect who I am as a trainee
  As someone using Silverfox
  I want to record my personal training details

  Rule: A person can record and update their personal details

    Scenario: Updating my profile
      Given I want Silverfox to know I am at an intermediate training level
      When I set my training experience to "intermediate"
      Then my profile shows my training experience as "intermediate"

  Rule: Age must fall within a realistic human range

    Scenario Outline: Age boundaries
      Given I am updating my profile
      When I try to set my age to <age>
      Then my age is <outcome>

      Examples:
        | age | outcome      |
        | 13  | accepted     |
        | 120 | accepted     |
        | 12  | not accepted |
        | 121 | not accepted |
