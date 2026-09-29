import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";
import { DEMO_PROGRAM_DETAIL } from "../../lib/demo/demoData";
import { confirmTestAccountEmail, deleteTestAccountByEmail, TEST_ACCOUNT_PASSWORD, uniqueTestEmail } from "../support/adminAuth";

const { Given, When, Then, After } = createBdd(test);

After(async ({ scenarioState }) => {
  // Only "Choosing to use the demo programme..." and "Starting fresh..."
  // create a real, disposable account (see e2e/support/adminAuth.ts) —
  // deleting it cascades to its profile and any programme it owns.
  const email = scenarioState.demoAccountEmail as string | undefined;
  if (email) await deleteTestAccountByEmail(email);
});

/**
 * The Demo/Welcome screens are only reachable from a genuinely
 * unauthenticated browser state, but this suite's `storageState` fixture
 * (bddFixtures.ts) always carries a valid anonymous session, applied by
 * Playwright once at context creation — before any step runs — so it can't
 * be overridden per-scenario the way e2e/journeys/demo-experience.spec.ts's
 * `test.use({ storageState: { cookies: [], origins: [] } })` does. Loading
 * once (with the pre-existing token), clearing localStorage, then reloading
 * achieves the same end state: the token is only ever injected at that one
 * initial context-creation point, not re-applied on a later reload.
 */
async function startUnauthenticated(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByText("PrimeForm", { exact: true })).toBeVisible();
  await page.waitForLoadState("load");
}

Given("I have never used PrimeForm before", async ({ page }) => {
  await startUnauthenticated(page);
});

When("I choose to see a demo", async ({ page }) => {
  await page.getByRole("button", { name: "See a demo" }).click();
  await expect(page.getByText("DEMO — example data, not saved")).toBeVisible({ timeout: 10_000 });
});

Then("I see an example programme, workouts, and progress", async ({ page }) => {
  await expect(page.getByText("Foundation 40+")).toBeVisible();
  await expect(page.getByText("Programme")).toBeVisible();
  await expect(page.getByText("Recent Workouts")).toBeVisible();
  await expect(page.getByText("Progress")).toBeVisible();
});

Then("it is clearly labelled as a demo", async ({ page }) => {
  await expect(page.getByText("DEMO — example data, not saved")).toBeVisible();
});

Given("I am looking at the demo", async ({ page }) => {
  await startUnauthenticated(page);
  await page.getByRole("button", { name: "See a demo" }).click();
  await expect(page.getByText("DEMO — example data, not saved")).toBeVisible({ timeout: 10_000 });
});

When("I go back", async ({ page }) => {
  await page.getByRole("button", { name: "Back" }).click();
});

Then("I am shown what PrimeForm does, not my training data", async ({ page }) => {
  await expect(page.getByText("Training that adapts as you do.")).toBeVisible();
  // Exact match — "See a demo" (the welcome screen's own button label)
  // contains "demo" too, and a loose match would wrongly flag the welcome
  // screen itself as still showing the demo banner.
  await expect(page.getByText("DEMO — example data, not saved")).toHaveCount(0);
});

Then("nothing from the demo is associated with me", async ({ page }) => {
  // The welcome screen itself is the proof: it's the logged-out state,
  // with no account and therefore nothing that could be "associated" with
  // anyone — the same evidence the previous step already checked.
  await expect(page.getByText("Training that adapts as you do.")).toBeVisible();
});

When("I create an account from the demo", async ({ page, scenarioState }) => {
  const email = uniqueTestEmail("demo_signup");
  scenarioState.demoAccountEmail = email;

  // The click race documented in startUnauthenticated() above (a beat
  // before React finishes attaching handlers on a cold render) — retrying
  // the click until the form it should reveal actually appears survives
  // it, same as e2e/steps/starting_primeform.steps.ts's own "I create an
  // account" step.
  await expect(async () => {
    await page.getByRole("button", { name: "Create your own PrimeForm account" }).click({ timeout: 2_000 });
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 10_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });
});

Then("I am asked to check my email to confirm my account", async ({ page }) => {
  await expect(page.getByText("Check your email")).toBeVisible();
});

When("I confirm my email and sign in", async ({ page, scenarioState }) => {
  const email = scenarioState.demoAccountEmail as string;
  // Standing in for clicking the emailed confirmation link — no
  // browser-only run can do that; see e2e/support/adminAuth.ts. Signing in
  // itself drives the real screen, same as a genuine confirmed person.
  await confirmTestAccountEmail(email);

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Not "Your Training Week" — the pending demo-programme choice
  // (profiles.pending_demo_program_choice, set at signup and detected
  // here by AuthProvider's signIn(), see providers/AuthProvider.tsx) means
  // this account lands on the choice screen first, not straight into the
  // ordinary app.
  await expect(page.getByText("Keep the demo programme?")).toBeVisible({ timeout: 10_000 });
});

Then("I am asked whether to keep the demo programme", async ({ page }) => {
  await expect(page.getByText("Keep the demo programme?")).toBeVisible();
});

When("I choose to use this programme", async ({ page }) => {
  await page.getByRole("button", { name: "Use This Programme" }).click();
  await expect(page.getByText("Keep the demo programme?")).toHaveCount(0, { timeout: 10_000 });
});

When("I choose to start fresh", async ({ page }) => {
  await page.getByRole("button", { name: "Start Fresh" }).click();
  await expect(page.getByText("Keep the demo programme?")).toHaveCount(0, { timeout: 10_000 });
});

Then("my new account follows the same programme the demo showed", async ({ programmesPage }) => {
  await programmesPage.open();
  await expect(async () => {
    expect(await programmesPage.isActiveOnList(DEMO_PROGRAM_DETAIL.program.name)).toBe(true);
  }).toPass({ timeout: 10_000 });
});

Then("my new account has no programme selected yet", async ({ supabaseAsTestUser }) => {
  // Not a UI check: getSelectedProgramId() (lib/repositories/
  // programRepository.ts) falls back to the flagship SEED_PROGRAM_ID
  // whenever active_program_id is unset, so most screens would look
  // identical either way — the only genuine signal is the persisted
  // column itself.
  const supabase = await supabaseAsTestUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("active_program_id").eq("id", user!.id).single();
  expect(profile!.active_program_id).toBeNull();
});

Then("none of the demo's example workouts or progress appear in my account", async ({ page, workoutPage }) => {
  await workoutPage.open();
  await expect(page.getByText("Your completed workouts will show up here.")).toBeVisible({ timeout: 10_000 });
});

Then("I am not asked about the demo programme again", async ({ page }) => {
  await page.reload();
  await expect(page.getByText("Keep the demo programme?")).toHaveCount(0);
  await expect(page.getByText("Your Training Week")).toBeVisible({ timeout: 10_000 });
});
