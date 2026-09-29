import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";

const { Given, When, Then, After } = createBdd(test);

// "Creating an account" and "Signing in" are tagged @signupgap — see
// starting_primeform.feature's own comments above each.

const CREATED_PROGRAMME_NAME = "Strength 3 Days";

After(async ({ cleanupSupabaseAsTestUser }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (!supabase) return;
  await supabase.from("programs").delete().eq("name", CREATED_PROGRAMME_NAME);
});

// "Given I have never used PrimeForm before" is registered once, in
// demo_experience.steps.ts (identical text) — reused here.

When("I start PrimeForm", async ({ page }) => {
  // Both scenarios using this step already navigated once in their own
  // Given (demo_experience.steps.ts's startUnauthenticated for "First-ever
  // visit"; this file's own Given for "PrimeForm cannot be reached", which
  // needs a real reload afterward to actually exercise the boot sequence
  // against the now-expired-and-network-blocked session it just set up) —
  // a reload is a safe, idempotent "start" for both.
  await page.reload();
});

Then("I see what PrimeForm does", async ({ page }) => {
  await expect(page.getByText("Training that adapts as you do.")).toBeVisible();
});

Then("I have not been signed into anything", async ({ page }) => {
  const hasToken = await page.evaluate(() =>
    Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token")),
  );
  expect(hasToken).toBe(false);
});

Given('I am signed in and have a programme called "Strength 3 Days"', async ({ programmesPage }) => {
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(CREATED_PROGRAMME_NAME);
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();
});

// "When I close and reopen PrimeForm" is registered once, in
// workout_history.steps.ts (identical text) — reused here.

Then("I am still signed in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Your Training Week")).toBeVisible({ timeout: 10_000 });
});

Then('I still see "Strength 3 Days" in my programme library', async ({ programmesPage }) => {
  await programmesPage.open();
  await expect(programmesPage.viewButton(CREATED_PROGRAMME_NAME)).toBeVisible({ timeout: 10_000 });
});

Given("I am signed in", async () => {
  // Already true — this worker's storageState carries a valid anonymous
  // session by default (see bddFixtures.ts).
});

When("I sign out", async ({ homePage, page }) => {
  await homePage.goto("/");
  await homePage.goToProfile();
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page.getByText("Training that adapts as you do.")).toBeVisible({ timeout: 10_000 });
});

Then("I am no longer signed in", async ({ page }) => {
  const hasToken = await page.evaluate(() =>
    Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token")),
  );
  expect(hasToken).toBe(false);
});

// "And I am shown what PrimeForm does, not my training data" is registered
// once, in demo_experience.steps.ts (identical text) — reused here.

Given("I was signed in, but my session has since expired", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Your Training Week").waitFor({ timeout: 10_000 });
  // Corrupts the stored session so Supabase's own client can neither use it
  // directly nor refresh it — the same end state a genuinely expired
  // session (with an unusable refresh token) leaves the app in.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (!key) return;
    const session = JSON.parse(localStorage.getItem(key)!);
    session.access_token = "expired.invalid.token";
    session.refresh_token = "expired-invalid-refresh-token";
    session.expires_at = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem(key, JSON.stringify(session));
  });
});

When("I open PrimeForm again", async ({ page }) => {
  await page.reload();
});

Then("I am not shown the example demo either", async ({ page }) => {
  await expect(page.getByText("DEMO — example data, not saved")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "See a demo" })).toBeVisible();
});

Given("PrimeForm cannot be reached right now", async ({ page }) => {
  // A *valid, non-expired* cached session needs no network at all to
  // restore (supabase-js's getSession() just reads local storage) —
  // confirmed directly: blocking every Supabase request alone still
  // booted straight to Home. The app only genuinely *needs* the network on
  // launch when the cached session is expired and must be refreshed
  // first — so this backdates the existing session's expiry (keeping the
  // tokens themselves well-formed, unlike the "session has expired"
  // scenario's deliberately corrupted ones) to force that refresh attempt,
  // then blocks the network so it fails with a genuine connectivity error.
  await page.goto("/");
  await page.getByText("Your Training Week").waitFor({ timeout: 10_000 });
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (!key) return;
    const session = JSON.parse(localStorage.getItem(key)!);
    session.expires_at = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem(key, JSON.stringify(session));
  });
  await page.route("**/*.supabase.co/**", (route) => route.abort());
});

Then("I am told PrimeForm could not connect", async ({ page }) => {
  await expect(page.getByText("Couldn't connect")).toBeVisible({ timeout: 30_000 });
});

Then("I am offered a way to try again", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
});
