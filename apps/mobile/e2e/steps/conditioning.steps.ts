import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";

const { When, Then, After } = createBdd(test);

// No Given steps in this feature — each scenario starts a fresh cardio/
// mobility log directly from the Workouts tab.

After(async ({ cleanupSupabaseAsTestUser }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // Without this, every run this suite has ever done left a real row
  // behind — confirmed directly: after enough accumulated "Running"/"Hips"
  // sessions, the Recent Sessions list started rendering the same label the
  // log form's own type/focus chip already shows, making that chip's
  // getByText(..., { exact: true }) ambiguous (2 elements) instead of the
  // single match it's always been assumed to be.
  await supabase.from("conditioning_sessions").delete().eq("user_id", user.id);
  await supabase.from("mobility_sessions").delete().eq("user_id", user.id);
});

When("I log a {int} minute running session", async ({ workoutPage }, minutes: number) => {
  await workoutPage.open();
  await workoutPage.logCardio("Running", minutes);
});

Then("my training record includes that running session", async ({ workoutPage }) => {
  await expect(workoutPage.recentSessionEntry("Running")).toBeVisible({ timeout: 10_000 });
});

When("I log a {int} minute mobility session focused on hips", async ({ workoutPage }, minutes: number) => {
  await workoutPage.open();
  await workoutPage.logMobility("Hips", minutes);
});

Then("my training record includes that mobility session", async ({ workoutPage }) => {
  await expect(workoutPage.recentSessionEntry("Hips")).toBeVisible({ timeout: 10_000 });
});
