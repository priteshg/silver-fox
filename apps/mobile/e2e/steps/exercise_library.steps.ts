import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";

const { Given, When, Then, After } = createBdd(test);

const CREATED_EXERCISE_NAMES = ["Reverse Nordic Curl"];

After(async ({ cleanupSupabaseAsTestUser }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await supabase.from("exercises").delete().in("name", CREATED_EXERCISE_NAMES);
  // The over-length-name boundary scenario leaves a truncated custom exercise behind, starting with the repeated "X" — same cleanup pattern as e2e/journeys/exercise-library.spec.ts's afterEach.
  await supabase.from("exercises").delete().ilike("name", "X%");
});

Given("PrimeForm's exercise library includes {string}", async ({ exerciseLibraryPage }, _name: string) => {
  await exerciseLibraryPage.open();
});

Given("PrimeForm's exercise library does not include an exercise called {string}", async ({ exerciseLibraryPage }, _name: string) => {
  await exerciseLibraryPage.open();
});

When("I search the exercise library for {string}", async ({ exerciseLibraryPage }, query: string) => {
  await exerciseLibraryPage.search(query);
});

Then("{string} appears in the results", async ({ exerciseLibraryPage }, name: string) => {
  await expect(exerciseLibraryPage.resultFor(name)).toBeVisible();
});

Then("I am told no exercises match my search", async ({ exerciseLibraryPage }) => {
  await expect(exerciseLibraryPage.countLabel).toContainText("0 exercises");
});

Given("I want to train an exercise not in PrimeForm's library", async ({ exerciseLibraryPage }) => {
  await exerciseLibraryPage.startCreating();
});

When("I add an exercise called {string}", async ({ exerciseLibraryPage }, name: string) => {
  await exerciseLibraryPage.fillName(name);
  await exerciseLibraryPage.save();
});

Then("{string} appears in my exercise library", async ({ exerciseLibraryPage, page }, name: string) => {
  await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  await exerciseLibraryPage.open();
  await exerciseLibraryPage.search(name);
  await expect(exerciseLibraryPage.resultFor(name)).toBeVisible();
});

Given("I am creating a new exercise", async ({ exerciseLibraryPage, scenarioState }) => {
  await exerciseLibraryPage.startCreating();
  // Read by the shared steps in e2e/steps/common.steps.ts.
  scenarioState.nameFieldLabel = "Exercise Name";
});

Then("I cannot save the exercise", async ({ exerciseLibraryPage }) => {
  await expect(exerciseLibraryPage.saveButton).toBeDisabled();
});
