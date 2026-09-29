import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";
import { SEEDED_WORKOUT_PREFIX, seedCompletedWorkout } from "../support/seedWorkoutHistory";

const { Given, When, Then, After } = createBdd(test);

const CREATED_PROGRAMME_NAME = "E2E Empty Day Programme";

After(async ({ workoutPage, cleanupSupabaseAsTestUser }) => {
  await workoutPage.discardViaStorage();
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await supabase.from("programs").delete().eq("name", CREATED_PROGRAMME_NAME);
  await supabase.from("workouts").delete().like("id", `${SEEDED_WORKOUT_PREFIX}%`);
});

/**
 * Ensures Foundation 40+ is active, then switches to the Workouts tab via
 * in-app tab navigation (not workoutPage.open(), which does a full
 * page.goto("/") reload) — chaining two full reloads back to back (one for
 * the Programmes-tab visit, one for Workouts) raced the app's own
 * auth/session-restoration on the second reload, confirmed directly: it
 * intermittently left "Start Push" clickable-looking but structurally
 * inert, with no visible error and no navigation on click.
 */
async function ensureFoundation40PlusActiveThenGoToWorkouts(
  programmesPage: import("../pages/ProgrammesPage").ProgrammesPage,
  workoutPage: import("../pages/WorkoutPage").WorkoutPage,
) {
  await programmesPage.open();
  if (!(await programmesPage.isActiveOnList("Foundation 40+"))) {
    await programmesPage.makeMyProgrammeFromList("Foundation 40+");
  }
  await programmesPage.goToTab("Workouts");
  await workoutPage.waitForReady();
}

Given('"Push" is today\'s training day in the programme I am following', async ({ workoutPage, programmesPage }) => {
  await ensureFoundation40PlusActiveThenGoToWorkouts(programmesPage, workoutPage);
  await expect(workoutPage.startButtonFor("Push")).toBeVisible({ timeout: 10_000 });
});

When('I start "Push"', async ({ workoutPage, scenarioState }) => {
  await workoutPage.startFirstDay();
  // The shared "I am performing \"Push\"" handler below (registered once
  // as a Given, also matching this scenario's own "Then" line — keyword-
  // agnostic matching, see its comment) checks this flag before redoing
  // setup. Without setting it here too, that Then re-ran the whole start
  // flow a second time — including discardViaStorage() — wiping out the
  // workout this step had just genuinely started, which is what actually
  // caused the click-seems-to-do-nothing symptom chased at length above.
  scenarioState.pushWorkoutStarted = true;
});

// Registered once as a Given — this exact text ("I am performing \"Push\"")
// is also this scenario's own Then line, and the "Resuming a workout in
// progress" scenario's Given. Cucumber keywords don't create separate
// namespaces (see e2e/steps/programme_exercises.steps.ts's
// ensureExerciseTarget for the same pattern), so a second Then/Given
// registration is an ambiguous duplicate — confirmed directly via bddgen's
// own error for this exact case. Builds the state (starts the workout) only
// the first time it runs in a scenario; a later call just re-verifies.
Given('I am performing "Push"', async ({ page, workoutPage, programmesPage, scenarioState }) => {
  if (!scenarioState.pushWorkoutStarted) {
    await ensureFoundation40PlusActiveThenGoToWorkouts(programmesPage, workoutPage);
    await workoutPage.startFirstDay();
    scenarioState.pushWorkoutStarted = true;
  }
  await expect(page.getByRole("button", { name: "Finish workout" })).toBeVisible();
});

Given('"Push" has no exercises', async ({ programmesPage }) => {
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(CREATED_PROGRAMME_NAME);
  // The form defaults to 3 days (Push/Pull/Legs) — day 1 is already named
  // "Push" and, since nothing is added to it, has no exercises.
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
  await programmesPage.makeMyProgrammeFromDetail();
});

When('I consider starting "Push"', async ({ workoutPage }) => {
  await workoutPage.open();
});

Then("I am not offered a way to start it", async ({ workoutPage }) => {
  await expect(workoutPage.startButtonFor("Push")).toBeDisabled();
});

// "When I close and reopen PrimeForm" is registered once, in
// workout_history.steps.ts (identical text) — reused here.

Then('I am offered a way to resume "Push"', async ({ page }) => {
  // A reload re-renders whatever path the browser was already on
  // (/workout/active persists across reload); Home is where the "Resume
  // Workout" CTA specifically lives, so navigate there explicitly.
  await page.goto("/");
  await expect(page.getByText("Resume Workout")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Push", { exact: true })).toBeVisible();
});

Given("I have completed a set of Bench Press", async ({ workoutPage }) => {
  await workoutPage.completeFirstSet("8");
});

When("I finish my workout", async ({ workoutPage, supabaseAsTestUser }) => {
  // Finish workout is Alert.alert-gated (a no-op on web) — seeds the same
  // end state a genuine finish produces instead of driving the real button.
  await workoutPage.discardViaStorage();
  const supabase = await supabaseAsTestUser();
  await seedCompletedWorkout(supabase, "Bench Press", 20, 8, { daysAgo: 0 });
});

Then("my workout history includes this workout", async ({ workoutPage, page }) => {
  await workoutPage.open();
  await expect(page.getByText("Your completed workouts will show up here.")).toHaveCount(0);
});

When("I discard the workout", async ({ workoutPage }) => {
  // Discard is Alert.alert-gated (a no-op on web) — clears the same
  // storage key discardSession() itself clears (providers/
  // ActiveSessionProvider.tsx), the direct effect a confirmed discard has.
  await workoutPage.discardViaStorage();
});

Then("my workout history does not include this workout", async ({ workoutPage, page }) => {
  await workoutPage.open();
  await expect(page.getByText("Your completed workouts will show up here.")).toBeVisible();
});

When('I try to start "Pull" as well', async ({ page, workoutPage }) => {
  // The active workout screen has no tab bar of its own — go back to reach
  // a screen with the day list, matching navigation.spec.ts's own tolerant
  // handling of this app's back-button behaviour.
  await page.goBack();
  await workoutPage.startButtonFor("Pull").click({ timeout: 5_000 }).catch(() => {});
});

Then('I am asked to confirm before "Push" is discarded', async ({ page }) => {
  // The real dialog can't be observed here (see this scenario's comment in
  // workouts.feature) — what's genuinely verifiable is the rule's intent:
  // Push must still be exactly where it was, not silently replaced. A
  // one-shot isVisible() check here was flaky (caught the page mid-render,
  // before "Resume Workout" had appeared) — a waited assertion is what's
  // actually needed, not evidence of a real failure to stay resumable.
  await page.goto("/");
  await expect(page.getByText("Resume Workout")).toBeVisible({ timeout: 10_000 });
});
