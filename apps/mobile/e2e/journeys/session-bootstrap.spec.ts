import { expect, test } from "../support/fixtures";

test.describe("Session bootstrap (the closest thing this app has to an auth journey)", () => {
  test("a fresh browser context gets an anonymous session and reaches Home", { tag: "@smoke" }, async ({ readyPage }) => {
    await expect(readyPage.getByText("BUILD YOUR NEXT DECADE.")).toBeVisible();
    await expect(readyPage.getByText("Your Training Week")).toBeVisible();
    // Bottom nav present — the app is genuinely interactive, not stuck loading.
    await expect(readyPage.getByRole("tab", { name: /Home/i })).toBeVisible();
  });

  test("the session survives a full page reload", async ({ readyPage }) => {
    await readyPage.reload();
    // Was 20_000 — a stale margin from before the production-mode webServer
    // optimization (playwright.config.ts) made reloads ~0.5-1s. 10s matches
    // this suite's navigation tier and still fails fast if reload genuinely
    // breaks, instead of masking it behind a needlessly long wait.
    await expect(readyPage.getByText("Your Training Week")).toBeVisible({ timeout: 10_000 });
  });
});
