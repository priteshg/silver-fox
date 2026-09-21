import { expect, test } from "../support/fixtures";

test.describe("Session bootstrap (the closest thing this app has to an auth journey)", () => {
  test("a fresh browser context gets an anonymous session and reaches Home", async ({ readyPage }) => {
    await expect(readyPage.getByText("BUILD YOUR NEXT DECADE.")).toBeVisible();
    await expect(readyPage.getByText("Your Training Week")).toBeVisible();
    // Bottom nav present — the app is genuinely interactive, not stuck loading.
    await expect(readyPage.getByRole("tab", { name: /Home/i })).toBeVisible();
  });

  test("the session survives a full page reload", async ({ readyPage }) => {
    await readyPage.reload();
    await expect(readyPage.getByText("Your Training Week")).toBeVisible({ timeout: 20_000 });
  });
});
