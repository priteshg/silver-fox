import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  readonly weekHeading: Locator;
  readonly profileButton: Locator;

  constructor(page: Page) {
    super(page);
    this.weekHeading = page.getByText("Your Training Week");
    this.profileButton = page.getByLabel("Your profile");
  }

  async waitForReady(): Promise<void> {
    await expect(this.weekHeading).toBeVisible({ timeout: 10_000 });
  }

  async goToProfile(): Promise<void> {
    await this.profileButton.click();
  }
}
