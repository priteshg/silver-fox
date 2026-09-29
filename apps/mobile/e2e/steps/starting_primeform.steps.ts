import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";
import {
  confirmTestAccountEmail,
  createConfirmedTestAccount,
  deleteTestAccountByEmail,
  getAdminClient,
  TEST_ACCOUNT_PASSWORD,
  uniqueTestEmail,
} from "../support/adminAuth";

const { Given, When, Then, After } = createBdd(test);

const CREATED_PROGRAMME_NAME = "Strength 3 Days";
const FIXTURE_ACCOUNT_PROGRAMME_NAME = "My Own Programme";

After(async ({ cleanupSupabaseAsTestUser, scenarioState }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (supabase) await supabase.from("programs").delete().eq("name", CREATED_PROGRAMME_NAME);
  // "Creating an account" and "Signing in" each mint a real, disposable
  // Supabase Auth account via the Admin API (see e2e/support/adminAuth.ts)
  // — deleting it cascades to its profile and any programmes it owns (see
  // supabase/migrations' `on delete cascade` FKs), so this alone is
  // complete cleanup for those.
  const email = scenarioState.adminCreatedAccountEmail as string | undefined;
  if (email) await deleteTestAccountByEmail(email);
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

When("I create an account", async ({ page, scenarioState }) => {
  const email = uniqueTestEmail("create_account");
  scenarioState.adminCreatedAccountEmail = email;

  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });

  // Confirmation-required is this project's real, deliberate Supabase Auth
  // setting (see lib/supabase/auth.ts's SignUpResult doc comment) — no
  // browser-only run can click a real emailed link, so the Admin API
  // stands in for exactly that one step. Everything else — creating the
  // account, and now signing into it — goes through the real screens, the
  // same as a genuine person who has just confirmed their email would do.
  await confirmTestAccountEmail(email);

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Your Training Week")).toBeVisible({ timeout: 10_000 });
});

Then("I can use the application", async ({ page }) => {
  await expect(page.getByText("Your Training Week")).toBeVisible();
});

Then("my training data belongs only to me", async ({ programmesPage, supabaseAsTestUser }) => {
  // Create something real under this brand-new account, then confirm it's
  // owned by this account's own id — the concrete, checkable meaning of
  // "belongs only to me" under this schema's RLS (see
  // supabase/migrations/20260918213639_programs.sql's owner_id policies).
  await programmesPage.open();
  await programmesPage.startCreating();
  await programmesPage.fillName(FIXTURE_ACCOUNT_PROGRAMME_NAME);
  await programmesPage.createProgramme();
  await programmesPage.waitForDetailReady();

  const supabase = await supabaseAsTestUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: program } = await supabase.from("programs").select("owner_id").eq("name", FIXTURE_ACCOUNT_PROGRAMME_NAME).single();
  expect(program!.owner_id).toBe(user!.id);
});

Given("I already have a PrimeForm account", async ({ scenarioState }) => {
  const email = uniqueTestEmail("sign_in");
  scenarioState.adminCreatedAccountEmail = email;
  scenarioState.fixtureAccountEmail = email;

  // Minted directly, not via the real signup screens — this scenario's own
  // precondition is "already has an account", not the act of creating one
  // (that's "Creating an account", above).
  const userId = await createConfirmedTestAccount(email, TEST_ACCOUNT_PASSWORD);

  // A distinguishing piece of this account's own data for "Then I see my
  // own training data" to check for — created via the admin client since
  // there's no browser session for this account yet at Given-time.
  const admin = getAdminClient();
  const { error } = await admin.from("programs").insert({
    id: `e2e_fixture_${userId}`,
    owner_id: userId,
    name: FIXTURE_ACCOUNT_PROGRAMME_NAME,
    is_custom: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
});

When("I sign in", async ({ page, scenarioState }) => {
  const email = scenarioState.fixtureAccountEmail as string;
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByText("PrimeForm", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Your Training Week")).toBeVisible({ timeout: 10_000 });
});

Then("I see my own training data", async ({ programmesPage }) => {
  await programmesPage.open();
  await expect(programmesPage.viewButton(FIXTURE_ACCOUNT_PROGRAMME_NAME)).toBeVisible({ timeout: 10_000 });
});
