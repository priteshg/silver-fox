import { createBdd } from "playwright-bdd";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/bddFixtures";
import type { ProgrammesPage } from "../pages/ProgrammesPage";

const { Given, When, Then, After } = createBdd(test);

const PROGRAMME_NAME = "Strength 3 Days";

After(async ({ cleanupSupabaseAsTestUser }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await supabase.from("programs").delete().eq("name", PROGRAMME_NAME);
});

/** Creates a fresh custom programme with exactly one day, named "Push" (the stepper's default day-1 name — see programs/new.tsx). */
async function createProgrammeWithOneDay(programmesPage: ProgrammesPage, page: Page, dayName: string) {
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(PROGRAMME_NAME);
  await page.getByRole("button", { name: "Decrease Training Days Per Week" }).click();
  await page.getByRole("button", { name: "Decrease Training Days Per Week" }).click();
  await page.getByLabel("Day 1").fill(dayName);
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
}

Given("I have a programme called {string} with a day called {string}", async ({ programmesPage, page }, _name: string, dayName: string) => {
  await createProgrammeWithOneDay(programmesPage, page, dayName);
});

When("I add {string} to {string} aiming for {int} sets of {int} to {int} repetitions", async (
  { programmesPage },
  exerciseName: string,
  _dayName: string,
  sets: number,
  low: number,
  high: number,
) => {
  await programmesPage.addExercise();
  await programmesPage.searchAddExercise(exerciseName);
  await programmesPage.pickExerciseToAdd(exerciseName);
  await programmesPage.setTargetSets(3, sets);
  await programmesPage.setTargetRepsLow(8, low);
  await programmesPage.setTargetRepsHigh(12, high);
  await programmesPage.addToDay();
});

/**
 * Shared by scenario 1's outcome ("Then ... includes ... with a target of
 * ...") and scenario 2's precondition ("Given ... includes ... with a
 * target of ..." — identical Gherkin text; Cucumber keywords don't create
 * separate namespaces, so one handler serves both). When called as a Given
 * with no programme set up yet (`scenarioState.pushDayReady` unset), it
 * builds the whole precondition from scratch; when called as a Then right
 * after the matching When has already produced that state, it only verifies.
 */
async function ensureExerciseTarget(
  programmesPage: ProgrammesPage,
  page: Page,
  scenarioState: Record<string, unknown>,
  dayName: string,
  exerciseName: string,
  sets: number,
  low: number,
  high: number,
) {
  if (!scenarioState.pushDayReady) {
    await createProgrammeWithOneDay(programmesPage, page, dayName);
    await programmesPage.addExercise();
    await programmesPage.searchAddExercise(exerciseName);
    await programmesPage.pickExerciseToAdd(exerciseName);
    await programmesPage.setTargetSets(3, sets);
    await programmesPage.setTargetRepsLow(8, low);
    await programmesPage.setTargetRepsHigh(12, high);
    await programmesPage.addToDay();
    scenarioState.pushDayReady = true;
  }
  await expect(page.getByText(`${sets} × ${low}-${high}`)).toBeVisible({ timeout: 10_000 });
}

// Registered once as a Given: playwright-bdd (like Cucumber generally)
// matches step text independent of the calling keyword, so this single
// handler also satisfies the identical "Then ..." text in scenario 1 — a
// second registration under Then would be flagged as an ambiguous
// duplicate match (confirmed directly via bddgen's own error for exactly
// that).
Given(
  "{string} includes {string} with a target of {int} sets of {int} to {int} repetitions",
  async ({ programmesPage, page, scenarioState }, dayName: string, exerciseName: string, sets: number, low: number, high: number) => {
    await ensureExerciseTarget(programmesPage, page, scenarioState, dayName, exerciseName, sets, low, high);
  },
);

Then(
  "{string} shows {string} with a target of {int} sets of {int} to {int} repetitions",
  async ({ page }, _dayName: string, _exerciseName: string, sets: number, low: number, high: number) => {
    await expect(page.getByText(`${sets} × ${low}-${high}`)).toBeVisible({ timeout: 10_000 });
  },
);

// Only scenario using this step always precedes it with the Given above
// (Bench Press, low end starting at 6) — hardcoded rather than threaded
// through scenarioState, since there is exactly one caller.
When("I change the target to {int} to {int} repetitions", async ({ programmesPage }, low: number, high: number) => {
  await programmesPage.openExercise("Bench Press");
  await programmesPage.setTargetRepsLow(6, low);
  await programmesPage.saveChanges();
});

// Registered once as a Given, same reasoning as ensureExerciseTarget above —
// this exact pattern also matches the scenario's "Then" line (with the two
// names swapped), and a second Then registration is an ambiguous duplicate.
// Builds the day + both exercises (in the given order) only the first time
// it runs in a scenario; a later call (the Then, after the move) just
// re-checks the current order.
Given("{string} lists {string} before {string}", async ({ programmesPage, page, scenarioState }, dayName: string, first: string, second: string) => {
  if (!scenarioState.pushDayReady) {
    await createProgrammeWithOneDay(programmesPage, page, dayName);
    for (const exerciseName of [first, second]) {
      await programmesPage.addExercise();
      await programmesPage.searchAddExercise(exerciseName);
      await programmesPage.pickExerciseToAdd(exerciseName);
      await programmesPage.addToDay();
      // addToDay() navigates back to the detail screen — wait for this
      // exercise's own row before looping to add the next one, or (for the
      // last iteration) before orderOf() below reads the DOM.
      await expect(programmesPage.exerciseRow(exerciseName)).toBeVisible({ timeout: 10_000 });
    }
    scenarioState.pushDayReady = true;
  }
  // moveExercise() (triggered by the preceding "When I move ... earlier"
  // step, when this runs as the scenario's Then) is an async write —
  // clicking the button only waits for the event dispatch, not that
  // in-flight reorder, so poll until the DOM actually reflects it rather
  // than checking once.
  await expect(async () => {
    const order = await programmesPage.orderOf([first, second]);
    expect(order).toEqual([first, second]);
  }).toPass({ timeout: 10_000 });
});

When("I move {string} earlier in {string}", async ({ programmesPage }, exerciseName: string, _dayName: string) => {
  await programmesPage.moveUp(exerciseName);
});

Given("{string} includes {string}", async ({ programmesPage, page }, dayName: string, exerciseName: string) => {
  await createProgrammeWithOneDay(programmesPage, page, dayName);
  await programmesPage.addExercise();
  await programmesPage.searchAddExercise(exerciseName);
  await programmesPage.pickExerciseToAdd(exerciseName);
  await programmesPage.addToDay();
  await expect(programmesPage.exerciseRow(exerciseName)).toBeVisible({ timeout: 10_000 });
});

When("I remove {string} from {string}", async ({ page, supabaseAsTestUser }, exerciseName: string, dayName: string) => {
  // Removing is Alert.alert-gated (a no-op on web) — deletes the
  // program_exercises row directly via Supabase, the same outcome a
  // confirmed removal produces, then reloads to see the result.
  const supabase = await supabaseAsTestUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: program } = await supabase.from("programs").select("id").eq("name", PROGRAMME_NAME).eq("owner_id", user!.id).single();
  const { data: day } = await supabase.from("program_sessions").select("id").eq("program_id", program!.id).eq("name", dayName).single();
  const { data: exercise } = await supabase.from("exercises").select("id").eq("name", exerciseName).single();
  await supabase.from("program_exercises").delete().eq("session_id", day!.id).eq("exercise_id", exercise!.id);
  await page.reload();
});

Then("{string} no longer includes {string}", async ({ programmesPage }, _dayName: string, exerciseName: string) => {
  await programmesPage.waitForDetailReady();
  await expect(programmesPage.exerciseRow(exerciseName)).toHaveCount(0);
});
