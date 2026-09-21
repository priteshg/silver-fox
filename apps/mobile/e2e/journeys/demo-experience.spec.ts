import { expect, test, type Page } from "@playwright/test";

/**
 * Demo (and the logged-out welcome screen behind it) is only reachable from
 * a genuinely unauthenticated browser state — the shared `readyPage` fixture
 * every other spec file uses (support/fixtures.ts) always carries a valid
 * anonymous session by design, specifically so those tests don't pay a
 * sign-in cost per test. That's the wrong starting point here, so this file
 * overrides `storageState` to empty rather than using the shared fixtures —
 * Playwright's own built-in `page` fixture still picks up the project's
 * `baseURL`/device config normally, just with no session in it.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Every other spec file's first click of a session happens on the shared
 * worker fixture's page, which already waited for a definitive "app ready"
 * signal (support/fixtures.ts's sharedPage) before any test ever touches
 * it. This file's tests are each the very first interaction on a brand-new,
 * cold page load, and on `android-pixel-7` specifically that first click can
 * land a beat before React's event handlers finish attaching — confirmed
 * directly: the same click dispatched via the DOM's own `.click()` instead
 * of a simulated pointer event renders the demo screen correctly every
 * time, so this is a hydration-timing race in the test, not a product bug.
 * Waiting for network idle before the first click closes that window.
 */
async function goToWelcomeScreen(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Silverfox", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("Demo experience", () => {
  test("shows realistic content and never issues a single request to Supabase", async ({ page }) => {
    const supabaseRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes(".supabase.co")) supabaseRequests.push(req.url());
    });

    await goToWelcomeScreen(page);
    await page.getByRole("button", { name: "See a demo" }).click();

    await expect(page.getByText("DEMO — example data, not saved")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Foundation 40+")).toBeVisible();
    await expect(page.getByText("Programme")).toBeVisible();
    await expect(page.getByText("Recent Workouts")).toBeVisible();
    await expect(page.getByText("Progress")).toBeVisible();
    await expect(page.getByText("Profile")).toBeVisible();
    // The fabricated Bench Press history is shaped to produce a live
    // suggestion — confirms Demo's Progress section is a real computed
    // result, not just static placeholder text.
    await expect(page.getByText(/Suggested next Bench Press/)).toBeVisible();

    expect(supabaseRequests, `Demo must never touch Supabase, but saw: ${supabaseRequests.join(", ")}`).toHaveLength(
      0,
    );
  });

  test("leaving the demo returns to the logged-out welcome screen, with nothing retained", async ({ page }) => {
    await goToWelcomeScreen(page);
    await page.getByRole("button", { name: "See a demo" }).click();
    await expect(page.getByText("DEMO — example data, not saved")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByText("Follow a training programme, log your workouts, and see your progress over time."),
    ).toBeVisible();
    // Exact match — "See a demo" (the welcome screen's own button label)
    // contains "demo" too, and getByText's default substring match is
    // case-insensitive, so a loose match here would wrongly flag the
    // welcome screen itself as still showing the demo banner.
    await expect(page.getByText("DEMO — example data, not saved")).toHaveCount(0);
  });
});
