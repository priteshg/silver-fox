import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * /profile is a stack screen pushed on top of the tab navigator (see
 * app/profile.tsx) — it has no tab bar of its own, so waitForReady() looks
 * for a field on the screen itself, and going back is how you leave it.
 */
export class ProfilePage extends BasePage {
  readonly ageField: Locator;
  readonly saveButton: Locator;
  readonly savedConfirmation: Locator;
  readonly ageRangeError: Locator;

  constructor(page: Page) {
    super(page);
    this.ageField = page.getByLabel("Age (optional)");
    this.saveButton = page.getByRole("button", { name: "Save Profile" });
    this.savedConfirmation = page.getByText("Saved.");
    this.ageRangeError = page.getByText(/between 13 and 120/i);
  }

  async waitForReady(): Promise<void> {
    await expect(this.ageField).toBeVisible({ timeout: 10_000 });
  }

  async isOpen(): Promise<boolean> {
    return this.ageField.isVisible().catch(() => false);
  }

  async setAge(age: string): Promise<void> {
    await this.ageField.fill(age);
  }

  async selectTrainingExperience(level: "beginner" | "intermediate" | "advanced"): Promise<void> {
    await this.page.getByText(level, { exact: true }).click();
  }

  /** Matches this screen's chip labels, which render with underscores replaced by spaces (see app/profile.tsx's `label()`). */
  async selectGoal(goal: string): Promise<void> {
    await this.page.getByText(goal.replace(/_/g, " "), { exact: true }).click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }
}
