import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";

const { Given, When, Then, After } = createBdd(test);

/**
 * Every programme this file's scenarios create, by its literal Gherkin
 * name — deleted after each scenario so repeated runs (and the fact several
 * scenarios reuse "Strength 3 Days") never leak into one another.
 */
const CREATED_PROGRAMME_NAMES = ["Strength 3 Days", "Strength and Size"];

After(async ({ cleanupSupabaseAsTestUser }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await supabase.from("programs").delete().in("name", CREATED_PROGRAMME_NAMES);
});

Given("PrimeForm offers a built-in programme called {string}", async ({ programmesPage }, name: string) => {
  await programmesPage.open();
  await expect(programmesPage.viewButton(name)).toBeVisible();
});

When("I make {string} my programme", async ({ programmesPage }, name: string) => {
  // Idempotent: this worker's anonymous user is reused across every
  // scenario (see e2e/fixtures/bddFixtures.ts), so "selected programme" can
  // already be Foundation 40+ from an earlier run — the list screen hides
  // "Make this my programme" once a programme is already active.
  if (await programmesPage.isActiveOnList(name)) return;
  await programmesPage.makeMyProgrammeFromList(name);
});

Then("{string} is the programme I am following", async ({ programmesPage }, name: string) => {
  await expect(async () => {
    expect(await programmesPage.isActiveOnList(name)).toBe(true);
  }).toPass({ timeout: 10_000 });
});

Given("I want to follow a programme of my own design", async ({ programmesPage }) => {
  await programmesPage.open();
});

When("I create a programme called {string} with {int} training days", async ({ programmesPage, page }, name: string, days: number) => {
  await programmesPage.startCreating();
  await programmesPage.fillName(name);
  if (days !== 3) {
    // The form defaults to 3 days (Push/Pull/Legs) — only touch the stepper when a scenario needs a different count.
    const current = 3;
    const buttonLabel = days > current ? "Increase Training Days Per Week" : "Decrease Training Days Per Week";
    for (let i = 0; i < Math.abs(days - current); i++) await page.getByRole("button", { name: buttonLabel }).click();
  }
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
  // "Then ... is the programme I am following" is part of the same user
  // journey as creating it — createProgram() itself never auto-selects
  // (confirmed directly in lib/repositories/programRepository.ts), so
  // making it active is the natural next action, not a separate scenario.
  await programmesPage.makeMyProgrammeFromDetail();
});

Then("{string} appears in my programme library", async ({ programmesPage }, name: string) => {
  await programmesPage.open();
  await expect(programmesPage.viewButton(name)).toBeVisible({ timeout: 10_000 });
});

Given("I have a programme called {string}", async ({ programmesPage }, name: string) => {
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(name);
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
});

When("I remove {string}", async ({ supabaseAsTestUser, scenarioState }, name: string) => {
  // Deleting is Alert.alert-gated (a no-op on web) — deletes the row
  // directly via Supabase, the same outcome a confirmed delete produces.
  const supabase = await supabaseAsTestUser();
  await supabase.from("programs").delete().eq("name", name);
  scenarioState.removedProgrammeName = name;
});

Then("it no longer appears in my programme library", async ({ programmesPage, scenarioState }) => {
  await programmesPage.open();
  await expect(programmesPage.viewButton(scenarioState.removedProgrammeName as string)).not.toBeVisible();
});

When("I rename it to {string}", async ({ programmesPage }, newName: string) => {
  await programmesPage.editDetails();
  await programmesPage.renameTo(newName);
});

Then("my programme library shows {string}", async ({ programmesPage }, name: string) => {
  await programmesPage.open();
  await expect(programmesPage.viewButton(name)).toBeVisible({ timeout: 10_000 });
});

When("I look at {string}", async ({ programmesPage }, name: string) => {
  await programmesPage.openProgramme(name);
});

Then("I am not offered a way to remove it", async ({ page }) => {
  await expect(page.getByText("Delete", { exact: true })).toHaveCount(0);
});

Given("I am creating a new programme", async ({ programmesPage, scenarioState }) => {
  await programmesPage.open();
  await programmesPage.startCreating();
  // Read by the shared steps in e2e/steps/common.steps.ts.
  scenarioState.nameFieldLabel = "Programme Name";
});

Then("I cannot create the programme", async ({ programmesPage }) => {
  await expect(programmesPage.createButton).toBeDisabled();
});
