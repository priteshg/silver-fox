import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ExerciseLibraryPage extends BasePage {
  readonly searchField: Locator;
  readonly countLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.searchField = page.getByLabel("Search");
    // Anchored to the whole text, not a substring match — Home's own
    // "Today's Plan" card renders "{count} exercises · ~{min} min" (see
    // app/(tabs)/index.tsx), which an unanchored /\d+ exercises/ also
    // matches whenever that card is still in the DOM during/after
    // navigating here (confirmed directly: a strict-mode violation with
    // both matched simultaneously). The library's own count is always a
    // bare "{count} exercises" with no suffix.
    this.countLabel = page.getByText(/^\d+ exercises$/);
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
