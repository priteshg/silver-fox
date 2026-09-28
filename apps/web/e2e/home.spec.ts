import { expect, test } from "@playwright/test";

test("home page shows the application name and demo interaction", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PrimeForm" })).toBeVisible();

  const button = page.getByRole("button", { name: "Tapped 0 times" });
  await button.click();
  await expect(page.getByRole("button", { name: "Tapped 1 times" })).toBeVisible();
});
