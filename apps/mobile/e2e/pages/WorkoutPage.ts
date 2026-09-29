import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/** The Workouts tab (list of days to start) and the active-workout / substitute screens it leads to. */
export class WorkoutPage extends BasePage {
  async waitForReady(): Promise<void> {
    await expect(this.page.getByRole("button", { name: /^Start /i }).first()).toBeVisible({ timeout: 10_000 });
  }

  async open(): Promise<void> {
    await this.openFromHome("Workouts");
  }

  /** Starts the first startable day (Foundation 40+'s "Push", with Bench Press first — see data/programmeCatalogue.ts). */
  async startFirstDay(): Promise<void> {
    // Defensive: startWorkout.ts's confirmAndStart() routes through
    // Alert.alert (a no-op on web — see e2e/journeys/delete-workflows.spec.ts)
    // whenever a session is already active, silently swallowing the click
    // instead of starting the new one. None of this suite's non-@webgap
    // scenarios intend to exercise that confirm path, so start from a
    // guaranteed-clean slate rather than depending on one never existing.
    await this.discardViaStorage();
    await this.page.getByRole("button", { name: /^Start /i }).first().click();
    await expect(this.page.getByRole("button", { name: "Finish workout" })).toBeVisible({ timeout: 10_000 });
  }

  startButtonFor(dayName: string): Locator {
    return this.page.getByRole("button", { name: `Start ${dayName}` });
  }

  get finishButton(): Locator {
    return this.page.getByRole("button", { name: "Finish workout" });
  }

  get swapExerciseLink(): Locator {
    return this.page.getByRole("button", { name: "Swap exercise" });
  }

  async openSubstitute(): Promise<void> {
    await this.swapExerciseLink.click();
    await expect(this.page.getByText(/^Replace /)).toBeVisible({ timeout: 10_000 });
  }

  async selectEquipment(equipment: string): Promise<void> {
    await this.page.getByRole("button", { name: equipment, exact: true }).click();
  }

  async useSubstitute(exerciseName: string): Promise<void> {
    await this.page.getByRole("button", { name: `Use ${exerciseName}` }).click();
  }

  async cancelSubstitute(): Promise<void> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }

  async completeFirstSet(reps: string): Promise<void> {
    await this.page.getByLabel("reps").first().fill(reps);
    await this.page.getByRole("button", { name: /^Complete set 1/ }).click();
  }

  // ── Set N specifically (workout_sets.feature — reps/RIR/weight/undo/remove) ─

  async fillReps(setIndex: number, value: string): Promise<void> {
    await this.page.getByLabel("reps").nth(setIndex).fill(value);
  }

  async fillRir(setIndex: number, value: string): Promise<void> {
    await this.page.getByLabel("RIR").nth(setIndex).fill(value);
  }

  ripLabelFor(setIndex: number): Locator {
    return this.page.getByLabel("RIR").nth(setIndex);
  }

  completeButtonFor(setNumber: number): Locator {
    // Matches both the not-yet-completed name ("Complete set N") and the
    // completed one ("Set N completed, ..."), since it's the same button —
    // tapping it again is what undoes a completed set.
    return this.page.getByRole("button", { name: new RegExp(`^(Complete set ${setNumber}|Set ${setNumber} completed,)`) });
  }

  async completeSet(setNumber: number): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(`^Complete set ${setNumber}`) }).click();
  }

  /** Same physical button as completeSet — SetRow.tsx's handleToggle undoes when already completed. */
  async undoSet(setNumber: number): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(`^Set ${setNumber} completed,`) }).click();
  }

  async removeSet(setNumber: number): Promise<void> {
    await this.page.getByRole("button", { name: `Remove set ${setNumber}` }).click();
  }

  async addSet(): Promise<void> {
    await this.page.getByRole("button", { name: "+ Add Set" }).click();
  }

  async increaseWeight(setIndex = 0): Promise<void> {
    await this.page.getByRole("button", { name: "Increase weight" }).nth(setIndex).click();
  }

  async decreaseWeight(setIndex = 0): Promise<void> {
    await this.page.getByRole("button", { name: "Decrease weight" }).nth(setIndex).click();
  }

  /** Reads the current stepper value from its `kg: {n}` accessibility label — weight isn't a text field. */
  async weightKg(setIndex = 0): Promise<number> {
    const label = await this.page.locator('[aria-label^="kg: "]').nth(setIndex).getAttribute("aria-label");
    return Number(label!.replace("kg: ", ""));
  }

  /** Drives the 0.5kg-stepper to an exact target via repeated clicks — WeightStepper's onChange uses a functional setState updater (`setWeight(current => ...)`), so this is safe to fire without an awaited confirmation between every single click, unlike the Target Sets stepper elsewhere in this app (see edit-cycle.spec.ts's "rapid taps" finding). */
  async setWeightKg(targetKg: number, setIndex = 0): Promise<void> {
    const current = await this.weightKg(setIndex);
    const steps = Math.round(Math.abs(targetKg - current) / 0.5);
    const buttonLabel = targetKg > current ? "Increase weight" : "Decrease weight";
    const button = this.page.getByRole("button", { name: buttonLabel }).nth(setIndex);
    for (let i = 0; i < steps; i++) await button.click();
    await expect(async () => {
      expect(await this.weightKg(setIndex)).toBe(targetKg);
    }).toPass({ timeout: 15_000 });
  }

  /** Clears an in-progress session directly — bypasses the Alert.alert-gated Discard button, which is a no-op on web (see e2e/journeys/delete-workflows.spec.ts). */
  async discardViaStorage(): Promise<void> {
    await this.page.evaluate(() => window.localStorage.removeItem("silverfox:activeSession"));
  }

  // ── Cardio / mobility logging (conditioning.feature) ────────────────────

  /** Default duration is 30 min (app/(tabs)/workouts/log-cardio.tsx) — only adjusted when a scenario needs a different value. */
  async logCardio(type: string, durationMinutes = 30): Promise<void> {
    await this.page.getByRole("button", { name: "Log Cardio", exact: true }).click();
    await this.page.getByText(type, { exact: true }).click();
    if (durationMinutes !== 30) await this.setDurationMinutes(durationMinutes, 5);
    await this.page.getByRole("button", { name: "Save Session" }).click();
    await this.waitForReady();
  }

  /** Default duration is 15 min (app/(tabs)/workouts/log-mobility.tsx). */
  async logMobility(focusLabel: string, durationMinutes = 15): Promise<void> {
    await this.page.getByRole("button", { name: "Log Mobility", exact: true }).click();
    await this.page.getByText(focusLabel, { exact: true }).click();
    if (durationMinutes !== 15) await this.setDurationMinutes(durationMinutes, 15);
    await this.page.getByRole("button", { name: "Save Session" }).click();
    await this.waitForReady();
  }

  private async setDurationMinutes(target: number, defaultValue: number): Promise<void> {
    const step = 5;
    const delta = Math.round((target - defaultValue) / step);
    const buttonLabel = delta > 0 ? "Increase Duration" : "Decrease Duration";
    for (let i = 0; i < Math.abs(delta); i++) await this.page.getByRole("button", { name: buttonLabel }).click();
  }

  recentSessionEntry(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }
}
