import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";
import { SEEDED_WORKOUT_PREFIX, seedCompletedWorkout } from "../support/seedWorkoutHistory";

const { Given, When, Then, After } = createBdd(test);

After(async ({ workoutPage, cleanupSupabaseAsTestUser }) => {
  await workoutPage.discardViaStorage();
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await supabase.from("workouts").delete().like("id", `${SEEDED_WORKOUT_PREFIX}%`);
});

Given("I have finished a workout including a completed set of Bench Press", async ({ workoutPage, supabaseAsTestUser }) => {
  await workoutPage.open();
  const supabase = await supabaseAsTestUser();
  await seedCompletedWorkout(supabase, "Bench Press", 80, 8);
});

When("I look at my progress", async ({ progressPage }) => {
  await progressPage.open();
});

Then("that workout is reflected in my progress", async ({ progressPage }) => {
  await expect(progressPage.strengthRowFor("Bench Press")).toBeVisible({ timeout: 10_000 });
});

Given("I discarded a workout without finishing it", async ({ workoutPage }) => {
  await workoutPage.open();
  await workoutPage.startFirstDay();
  await workoutPage.discardViaStorage();
});

Then("that workout is not reflected in my progress", async ({ progressPage }) => {
  await expect(progressPage.strengthRowFor("Bench Press")).not.toBeVisible();
});

Given("my best recorded set of Bench Press is {int} kg for {int} repetitions", async ({ workoutPage, supabaseAsTestUser }, weightKg: number, reps: number) => {
  await workoutPage.open();
  const supabase = await supabaseAsTestUser();
  await seedCompletedWorkout(supabase, "Bench Press", weightKg, reps, { daysAgo: 2 });
});

When("I finish a workout with {int} kg for {int} repetitions of Bench Press", async ({ supabaseAsTestUser }, weightKg: number, reps: number) => {
  // See progress.feature's comment above this scenario: this seeds the same
  // end state a genuine Finish workout produces, since that button is
  // gated behind Alert.alert (a no-op on web) and can't be driven directly.
  const supabase = await supabaseAsTestUser();
  await seedCompletedWorkout(supabase, "Bench Press", weightKg, reps, { daysAgo: 0 });
});

Then("that set is recognised as a new personal record for Bench Press", async ({ progressPage }) => {
  await progressPage.open();
  await expect(progressPage.heaviestWeightText("Bench Press", 85)).toBeVisible({ timeout: 10_000 });
});
