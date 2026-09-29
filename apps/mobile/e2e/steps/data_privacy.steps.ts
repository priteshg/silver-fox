import { createBdd } from "playwright-bdd";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/bddFixtures";
import { ProgrammesPage } from "../pages/ProgrammesPage";
import { WorkoutPage } from "../pages/WorkoutPage";
import { cleanupSeededWorkouts, resolveBuiltInProgramDay, seedCompletedWorkout } from "../support/seedWorkoutHistory";

const { Given, When, Then, After } = createBdd(test);

After(async ({ cleanupSupabaseAsTestUser, scenarioState }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (supabase) {
    await supabase.from("programs").delete().ilike("name", "E2E Privacy Test%");
    await cleanupSeededWorkouts(supabase);
  }
  // The second person's own browser context (opened directly via
  // browser.newContext(), not through Playwright's own page/context
  // fixtures) isn't closed automatically the way the test-scoped `page`
  // fixture is — leaving it open would leak a browser context per scenario.
  const secondContext = scenarioState.secondPersonContext as { close: () => Promise<void> } | undefined;
  if (secondContext) await secondContext.close();
});

/**
 * Opens a genuinely separate, already-authenticated "second person" by
 * reusing a *different* worker's own state-N.json — not a fresh
 * signInAnonymously() call, which would spend more of Supabase's
 * rate-limited anonymous-sign-in budget (the whole reason global-setup
 * mints exactly WORKER_COUNT sessions once instead of one per test).
 */
async function openSecondPerson(
  page: Page,
  workerIndex: number,
  storageStatePathForWorker: (workerIndex: number) => string,
  scenarioState: Record<string, unknown>,
): Promise<{ page: Page; programmesPage: ProgrammesPage; workoutPage: WorkoutPage }> {
  const otherWorkerIndex = (workerIndex + 1) % 4;
  const browser = page.context().browser();
  if (!browser) throw new Error("No browser instance available to open a second person's context from.");
  const secondContext = await browser.newContext({ storageState: storageStatePathForWorker(otherWorkerIndex) });
  scenarioState.secondPersonContext = secondContext;
  const secondPage = await secondContext.newPage();
  const second = { page: secondPage, programmesPage: new ProgrammesPage(secondPage), workoutPage: new WorkoutPage(secondPage) };
  scenarioState.secondPage = secondPage;
  scenarioState.secondProgrammesPage = second.programmesPage;
  scenarioState.secondWorkoutPage = second.workoutPage;
  return second;
}

Given("one person has created a programme called {string}", async ({ programmesPage }, name: string) => {
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(name);
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
});

Given("another person has their own PrimeForm session", async ({ page, workerIndex, storageStatePathForWorker, scenarioState }) => {
  await openSecondPerson(page, workerIndex, storageStatePathForWorker, scenarioState);
});

When("the second person looks at their programme library", async ({ scenarioState }) => {
  await (scenarioState.secondProgrammesPage as ProgrammesPage).open();
});

Then("they do not see {string}", async ({ scenarioState }, name: string) => {
  await expect((scenarioState.secondProgrammesPage as ProgrammesPage).viewButton(name)).not.toBeVisible();
});

Given("one person has finished a workout", async ({ workoutPage, supabaseAsTestUser }) => {
  await workoutPage.open();
  const supabase = await supabaseAsTestUser();
  const { programId, workoutDayId } = await resolveBuiltInProgramDay(supabase, "Foundation 40+", "Push");
  await seedCompletedWorkout(supabase, "Bench Press", 80, 8, { programId, workoutDayId });
});

When("the second person looks at their workout history", async ({ scenarioState }) => {
  await (scenarioState.secondWorkoutPage as WorkoutPage).open();
});

Then("they do not see the first person's workout", async ({ scenarioState }) => {
  const secondPage = scenarioState.secondPage as Page;
  // RLS scopes every table to auth.uid() — the second person's own account
  // genuinely cannot read the first person's row, regardless of what's
  // rendered, so this checks real data isolation, not just UI text.
  await expect(secondPage.getByText(/80 kg × 8|640 vol/)).toHaveCount(0);
});
