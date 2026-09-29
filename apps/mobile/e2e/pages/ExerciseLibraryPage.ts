import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ExerciseLibraryPage extends BasePage {
  readonly searchField: Locator;
  readonly countLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.searchField = page.getByLabel("Search");
    this.countLabel = page.getByText(/\d+ exercises/);
  }

  async waitForReady(): Promise<void> {
    await expect(this.countLabel).toBeVisible({ timeout: 10_000 });
  }

  async open(): Promise<void> {
    await this.openFromHome("Exercises");
  }

  async search(query: string): Promise<void> {
    await this.searchField.fill(query);
  }

  resultFor(exerciseName: string): Locator {
    return this.page.getByText(exerciseName, { exact: true });
  }

  // ── /exercises/new ───────────────────────────────────────────────────────

  async startCreating(): Promise<void> {
    await this.page.goto("/exercises/new");
  }

  async fillName(name: string): Promise<void> {
    await this.page.getByLabel("Exercise Name").fill(name);
  }

  get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Save Exercise" });
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
