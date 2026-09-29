import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Covers the Programmes tab list screen, /programs/new, the programme
 * detail screen, and the add-exercise / configure-exercise screens pushed
 * from it — kept as one Page Object rather than four, since every method
 * here is one step in the same "manage a programme's exercises" workflow
 * and splitting it further bought no real separation for this suite's size.
 */
export class ProgrammesPage extends BasePage {
  readonly libraryHeading: Locator;
  readonly createCustomLink: Locator;

  constructor(page: Page) {
    super(page);
    this.libraryHeading = page.getByText("Programme Library");
    this.createCustomLink = page.getByText("+ Create a custom programme", { exact: true });
  }

  async waitForReady(): Promise<void> {
    await expect(this.libraryHeading).toBeVisible({ timeout: 10_000 });
  }

  async open(): Promise<void> {
    await this.openFromHome("Programmes");
  }

  // ── List screen ──────────────────────────────────────────────────────────

  /** Matches regardless of whether the "your active programme" suffix is present. */
  viewButton(name: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(`^View ${escapeRegExp(name)}`) });
  }

  async openProgramme(name: string): Promise<void> {
    await this.viewButton(name).click();
    await this.waitForDetailReady();
  }

  async isActiveOnList(name: string): Promise<boolean> {
    const label = await this.viewButton(name).getAttribute("aria-label");
    return (label ?? "").includes("your active programme");
  }

  async makeMyProgrammeFromList(name: string): Promise<void> {
    const link = this.page.getByRole("button", { name: `Make ${name} your active programme` });
    await link.click();
    // Same async-write race as makeMyProgrammeFromDetail (selectProgram()
    // awaits a Supabase write before this link's own !isActive-gated render
    // updates) — wait for it to disappear before navigating away, or a
    // reload can land before the selection actually persisted.
    await expect(link).toHaveCount(0);
  }

  // ── /programs/new ───────────────────────────────────────────────────────

  async startCreating(): Promise<void> {
    await this.createCustomLink.click();
  }

  async fillName(name: string): Promise<void> {
    await this.page.getByLabel("Programme Name").fill(name);
  }

  async createProgramme(): Promise<void> {
    await this.page.getByRole("button", { name: "Create Programme" }).click();
  }

  get createButton(): Locator {
    return this.page.getByRole("button", { name: "Create Programme" });
  }

  // ── Detail screen ────────────────────────────────────────────────────────

  async waitForDetailReady(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });
  }

  async editDetails(): Promise<void> {
    await this.page.getByRole("button", { name: "Edit Details" }).click();
  }

  async renameTo(newName: string): Promise<void> {
    await this.page.getByLabel("Programme Name").fill(newName);
    await this.page.getByRole("button", { name: "Save" }).click();
    // saveEditing() awaits an async Supabase write before closing the edit
    // form — Playwright's click() only waits for the event dispatch, not
    // that in-flight await, so wait for the edit form to actually close
    // (proof the write resolved) before navigating away.
    await expect(this.page.getByText(newName)).toBeVisible({ timeout: 10_000 });
  }

  async makeMyProgrammeFromDetail(): Promise<void> {
    const button = this.page.getByRole("button", { name: "Make My Programme" });
    // Persisting the selection is an async write (lib/repositories/userRepository.ts's
    // setActiveProgramId) — Playwright's click() only waits for the event
    // dispatch, not that in-flight await, so wait for this button to
    // disappear (it only renders while !isActive) before navigating away
    // and relying on the selection having actually landed. Not a bare
    // "Active" text wait: expo-router keeps the previous (list) screen
    // mounted underneath this pushed detail screen, and that list can
    // already show a *different* programme's "Active" badge (e.g. from an
    // earlier scenario reusing this worker's account), making "Active" text
    // ambiguous — this button's exact name only ever exists on this screen.
    // Retrying the whole click-and-verify as one unit (not just the
    // click), same as WorkoutPage.startFirstDay(): confirmed directly that
    // this write can transiently fail — the button's onPress now surfaces
    // that as a real error banner instead of swallowing it, but a genuine
    // user seeing that error would just tap the button again, so this does
    // too, rather than failing the whole scenario on a single hiccup.
    await expect(async () => {
      await button.click({ timeout: 2_000 });
      await expect(button).toHaveCount(0, { timeout: 3_000 });
    }).toPass({ timeout: 15_000 });
  }

  async addExercise(): Promise<void> {
    await this.page.getByRole("button", { name: "Add Exercise" }).click();
  }

  /** The ReorderableRow for a programme exercise — its accessible name is "{title}, {subtitle}". */
  exerciseRow(exerciseName: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(`^${escapeRegExp(exerciseName)},`) });
  }

  async openExercise(exerciseName: string): Promise<void> {
    await this.page.getByText(exerciseName, { exact: true }).click();
  }

  async moveUp(exerciseName: string): Promise<void> {
    await this.page.getByRole("button", { name: `Move ${exerciseName} up` }).click();
  }

  async moveDown(exerciseName: string): Promise<void> {
    await this.page.getByRole("button", { name: `Move ${exerciseName} down` }).click();
  }

  /** DOM order of the given exercises' rows — reflects on-screen order. */
  async orderOf(exerciseNames: string[]): Promise<string[]> {
    const pattern = new RegExp(`^(${exerciseNames.map(escapeRegExp).join("|")}),`);
    const rows = this.page.getByRole("button", { name: pattern });
    const labels = await rows.evaluateAll((elements) => elements.map((el) => el.getAttribute("aria-label") ?? ""));
    return labels.map((label) => exerciseNames.find((name) => label.startsWith(`${name},`))!);
  }

  // ── Add-exercise picker + configure-exercise screen ────────────────────

  async searchAddExercise(query: string): Promise<void> {
    await this.page.getByLabel("Search").fill(query);
  }

  async pickExerciseToAdd(exerciseName: string): Promise<void> {
    await this.page.getByText(exerciseName, { exact: true }).click();
    await expect(this.page.getByLabel(/^Target Sets:/)).toBeVisible({ timeout: 10_000 });
  }

  async setTargetSets(from: number, to: number): Promise<void> {
    await this.setStepper("Target Sets", from, to);
  }

  async setTargetRepsLow(from: number, to: number): Promise<void> {
    await this.setStepper("Target Reps — Low", from, to);
  }

  async setTargetRepsHigh(from: number, to: number): Promise<void> {
    await this.setStepper("Target Reps — High", from, to);
  }

  private async setStepper(label: string, from: number, to: number): Promise<void> {
    await this.page.getByLabel(`${label}: ${from}`).waitFor({ timeout: 10_000 });
    const delta = to - from;
    const buttonLabel = delta > 0 ? `Increase ${label}` : `Decrease ${label}`;
    let current = from;
    for (let i = 0; i < Math.abs(delta); i++) {
      await this.page.getByRole("button", { name: buttonLabel }).click();
      current += delta > 0 ? 1 : -1;
      await this.page.getByLabel(`${label}: ${current}`).waitFor({ timeout: 5_000 });
    }
  }

  async addToDay(): Promise<void> {
    await this.page.getByRole("button", { name: "Add to Day" }).click();
  }

  async saveChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Save Changes" }).click();
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
