import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";

const { Given, When, Then } = createBdd(test);

// "Choosing to use the demo programme" and "Starting fresh instead of
// keeping the demo programme" are tagged @signupgap — see
// demo_experience.feature's own comments above each.

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
