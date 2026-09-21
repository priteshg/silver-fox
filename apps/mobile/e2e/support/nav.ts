import type { Page } from "@playwright/test";

/** The bottom tab bar's items render with role="tab" inside a tablist (confirmed via accessibility snapshot, not assumed). */
export async function goToTab(page: Page, name: "Home" | "Workouts" | "Programmes" | "Exercises" | "Progress") {
  await page.getByRole("tab", { name: new RegExp(name, "i") }).click();
}
