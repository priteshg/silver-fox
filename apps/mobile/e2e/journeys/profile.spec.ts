import { expect, test } from "../support/fixtures";
import { goToTab } from "../support/nav";

/**
 * Navigates to /profile via the in-app "Your profile" button on Home rather
 * than `page.goto("/profile")`, which forces a full document reload. Looping
 * tests that visit /profile several times were exceeding the default 60s
 * test timeout purely from repeated full reloads.
 */
async function goToProfile(page: import("@playwright/test").Page) {
  // /profile is a stack screen pushed on top of the tab navigator, so it has
  // no tab bar of its own — if we're already there from a prior loop
  // iteration, go back first to reach a screen with tabs again.
  const alreadyOnProfile = await page.getByLabel("Age (optional)").isVisible().catch(() => false);
  if (alreadyOnProfile) {
    await page.goBack();
    await page.getByRole("tab", { name: /Home/i }).waitFor({ timeout: 10_000 });
  }
  await goToTab(page, "Home");
  await page.getByLabel("Your profile").click();
  await page.getByLabel("Age (optional)").waitFor({ timeout: 10_000 });
}

/** Restores the profile to a clean slate so this file's tests don't leak into others. */
async function resetProfile(supabase: import("@supabase/supabase-js").SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ display_name: null, age: null, training_experience: null, goals: null, preferred_training_days_per_week: null, available_equipment: null })
    .eq("id", user.id);
}

test.describe("Profile", () => {
  test.afterEach(async ({ supabaseAsTestUser }) => {
    await resetProfile(supabaseAsTestUser);
  });

  test("happy path: fill in the profile, save, refresh, verify it persisted", async ({ readyPage }) => {
    // This comment used to justify 120s by claiming "a full reload takes
    // ~30s" — stale: the production-mode webServer (playwright.config.ts)
    // made reloads ~0.5-1s, and that claim was never revisited after the
    // fix. This test does one navigation, several fills/clicks, one save,
    // and one reload — 45s is a real margin above the 30s default for a
    // multi-step flow with real Supabase round-trips, not a guess.
    test.setTimeout(45_000);
    await goToProfile(readyPage);
    await readyPage.getByLabel("Age (optional)").fill("47");
    await readyPage.getByText("intermediate", { exact: true }).click();
    await readyPage.getByText("get stronger", { exact: true }).click();
    await readyPage.getByRole("button", { name: "Save Profile" }).click();
    await expect(readyPage.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

    await readyPage.reload();
    await expect(readyPage.getByLabel("Age (optional)")).toHaveValue("47", { timeout: 10_000 });
  });

  // The age-range boundary (13-120) and non-numeric-input handling used to
  // be tested here via 5 full profile-page round trips. That logic is now a
  // pure function (`isAgeInRange`, lib/ageValidation.ts) and a structural
  // digit-filter on the field itself (SetRow.tsx's filterAndClampDigits
  // pattern, applied the same way to the age field) — both covered by fast
  // unit tests. See E2E_PERFORMANCE_AUDIT.md §2. What remains acceptance-
  // worthy is that the real screen shows the error message when it should —
  // covered below in one pass instead of four.
  test("an out-of-range age shows a clear inline error and is not saved", async ({ readyPage, supabaseAsTestUser }) => {
    await goToProfile(readyPage);
    await readyPage.getByLabel("Age (optional)").fill("121");
    await readyPage.getByRole("button", { name: "Save Profile" }).click();
    await expect(readyPage.getByText(/between 13 and 120/i)).toBeVisible();

    const {
      data: { user },
    } = await supabaseAsTestUser.auth.getUser();
    const { data: profile } = await supabaseAsTestUser.from("profiles").select("age").eq("id", user!.id).single();
    expect(profile?.age ?? null, "an out-of-range age must never be persisted").toBeNull();
  });
});
