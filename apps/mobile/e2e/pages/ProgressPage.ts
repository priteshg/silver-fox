import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ProgressPage extends BasePage {
  async waitForReady(): Promise<void> {
    await expect(this.page.getByLabel("Progress dimension")).toBeVisible({ timeout: 10_000 });
  }

  async open(): Promise<void> {
    await this.openFromHome("Progress");
  }

  /** The Strength tab (default) row for a trained exercise — accessibilityLabel is `View progress for {name}`. */
  strengthRowFor(exerciseName: string): Locator {
    return this.page.getByRole("button", { name: `View progress for ${exerciseName}` });
  }

  /** The row's own "{heaviest} kg" figure — scoped to that exercise's row so it can't match a different exercise's number. */
  heaviestWeightText(exerciseName: string, kg: number): Locator {
    return this.strengthRowFor(exerciseName).getByText(`${kg} kg`, { exact: true });
  }
}
