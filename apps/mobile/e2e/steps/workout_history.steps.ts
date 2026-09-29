import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";
import {
  cleanupSeededWorkouts,
  resolveBuiltInProgramDay,
  seedCompletedWorkout,
} from "../support/seedWorkoutHistory";
import { ensureFoundation40PlusActiveThenGoToWorkouts } from "../support/ensureFoundation40Plus";

const { Given, When, Then, After } = createBdd(test);

const SEEDED_WEIGHT_KG = 80;
const SEEDED_REPS = 8;
const SEEDED_VOLUME = SEEDED_WEIGHT_KG * SEEDED_REPS;

/**
 * Matches the history row's own accessibilityLabel (added to
 * app/(tabs)/workouts/index.tsx specifically to make this row identifiable
 * — a real accessibility improvement, not just a test hook), not a bare
 * substring of its visible text. A plain `getByText(/640 vol/)` is
 * ambiguous whenever this worker's shared Supabase account (see
 * bddFixtures.ts) happens to hold more than one seeded workout with the
 * same volume at once — confirmed directly: progress.steps.ts's own seed
 * produced a second, differently-labelled row with an identical "640 vol"
 * substring, and a plain text match couldn't tell the rows apart.
 */
function historyRowLabel(dayName: string): RegExp {
  return new RegExp(`^${dayName}, completed .*, ${SEEDED_VOLUME} volume$`);
}

// "E2E History Check Programme" cleanup lives here, not inline in "the
// historical workout still reflects..." below — confirmed directly that a
// scenario failing at an *earlier* step (before reaching that Then) left
// this row behind uncleaned, and since it carries no unique-name guard,
// each such leftover run accumulated another same-named orphan, which then
// confused a *later* run's own "Make My Programme" write (ProgrammesPage.ts's
// own comment on makeMyProgrammeFromDetail has more on that write's
// transient-failure retry). An After() hook runs regardless of which step
// failed, so cleanup here can't be skipped the same way.
const CREATED_PROGRAMME_NAME = "E2E History Check Programme";

After(async ({ workoutPage, cleanupSupabaseAsTestUser }) => {
  await workoutPage.discardViaStorage();
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await cleanupSeededWorkouts(supabase);
  await supabase.from("programs").delete().eq("name", CREATED_PROGRAMME_NAME);
});

async function seedPushWorkout({ supabaseAsTestUser }: { supabaseAsTestUser: () => Promise<import("@supabase/supabase-js").SupabaseClient> }) {
  const supabase = await supabaseAsTestUser();
  const { programId, workoutDayId } = await resolveBuiltInProgramDay(supabase, "Foundation 40+", "Push");
  await seedCompletedWorkout(supabase, "Bench Press", SEEDED_WEIGHT_KG, SEEDED_REPS, { programId, workoutDayId });
}

Given('I have finished a workout of "Push"', async ({ workoutPage, supabaseAsTestUser }) => {
  await workoutPage.open();
  await seedPushWorkout({ supabaseAsTestUser });
});

When("I look at my workout history", async ({ workoutPage }) => {
  await workoutPage.open();
});

Then("I see that workout listed", async ({ page }) => {
  await expect(page.getByLabel(historyRowLabel("Push"))).toBeVisible({ timeout: 10_000 });
});

Given("I have completed today's workout", async ({ workoutPage, supabaseAsTestUser }) => {
  await workoutPage.open();
  await seedPushWorkout({ supabaseAsTestUser });
});

When("I view my workout history", async ({ workoutPage }) => {
  await workoutPage.open();
});

Then("the completed workout appears", async ({ page }) => {
  await expect(page.getByLabel(historyRowLabel("Push"))).toBeVisible({ timeout: 10_000 });
});

Then("its recorded sets match what I performed", async ({ page }) => {
  // The History list's only per-workout figure is total volume
  // (weight×reps summed) — this is the same evidence the previous step
  // checked, and it's the strongest verification this screen's actual UI
  // exposes (no per-workout detail view is reachable from this list).
  await expect(page.getByLabel(historyRowLabel("Push"))).toBeVisible();
});

Given("I completed a workout using my previous programme", async ({ workoutPage, supabaseAsTestUser }) => {
  await workoutPage.open();
  await seedPushWorkout({ supabaseAsTestUser });
});

When("I later change the programme", async ({ programmesPage }) => {
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(CREATED_PROGRAMME_NAME);
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
  await programmesPage.makeMyProgrammeFromDetail();
});

Then("the historical workout still reflects what I actually performed", async ({ workoutPage, page }) => {
  await workoutPage.open();
  await expect(page.getByLabel(historyRowLabel("Push"))).toBeVisible({ timeout: 10_000 });
});

Given("I discarded a workout of \"Push\" without finishing it", async ({ workoutPage, programmesPage }) => {
  await ensureFoundation40PlusActiveThenGoToWorkouts(programmesPage, workoutPage);
  await workoutPage.startFirstDay();
  await workoutPage.discardViaStorage();
});

Then("I do not see that workout listed", async ({ supabaseAsTestUser }) => {
  // The bare day name "Push" is ambiguous with the "Start Push" button
  // rendered on the same screen (see the feature file's header comment) —
  // checking directly that nothing was persisted is both unambiguous and a
  // more precise proof of "not recorded" than scraping UI text.
  const supabase = await supabaseAsTestUser();
  const { data } = await supabase.from("workouts").select("id");
  expect(data ?? []).toHaveLength(0);
});

When("I close and reopen PrimeForm", async ({ page }) => {
  await page.reload();
});

Then("I still see that workout in my history", async ({ workoutPage, page }) => {
  await workoutPage.open();
  await expect(page.getByLabel(historyRowLabel("Push"))).toBeVisible({ timeout: 10_000 });
});
