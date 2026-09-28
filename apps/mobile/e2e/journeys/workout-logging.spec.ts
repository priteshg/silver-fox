import { expect, test } from "../support/fixtures";
import { goToTab } from "../support/nav";

/** Weight is a +/- stepper (1kg steps, defaults to 20kg), not free text — reads the current value from its `kg: {n}` accessibility label. */
async function readWeightKg(page: import("@playwright/test").Page): Promise<number> {
  const label = await page.locator('[aria-label^="kg: "]').first().getAttribute("aria-label");
  return Number(label!.replace("kg: ", ""));
}

/**
 * Starts today's workout from the Workouts tab and lands on the active
 * workout screen. Navigates via the tab bar (a client-side route push, like
 * a real user tapping it) rather than `page.goto("/workouts")`, which for
 * expo-router on web forces a full document reload — re-fetching and
 * re-executing the ~1,100-module bundle and re-running every data hook on
 * both Home *and* Workouts from scratch. That mistake alone was making this
 * file's tests take roughly a minute each; the fix (this) reuses the
 * already-booted app instead.
 */
async function startTodaysWorkout(page: import("@playwright/test").Page) {
  await goToTab(page, "Workouts");
  // Each programme day renders as its own Pressable labeled "Start {dayName}"
  // (e.g. "Start Push") — there is no single generic "Start Workout" button.
  await page.getByRole("button", { name: /^Start /i }).first().click();
  await expect(page.getByRole("button", { name: "Finish workout" })).toBeVisible({ timeout: 10_000 });
}

async function discardIfActive(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.localStorage.removeItem("silverfox:activeSession"));
}

/**
 * Reps/RIR boundary and malformed-input coverage (the old REPS_CASES/
 * RIR_CASES/NAN_PROPAGATION_CASES loops — 25 full-workout-boot round trips)
 * moved to `components/__tests__/SetRow.test.tsx`, which tests the exact
 * pure function (`filterAndClampDigits`) these inputs exercise, in
 * milliseconds instead of minutes. See E2E_PERFORMANCE_AUDIT.md §2. What
 * remains here are the acceptance-level facts a unit test can't express:
 * that the real stepper/text-field wiring on the actual screen produces a
 * saved set with the values shown, and that the Log button's enabled state
 * genuinely gates real user interaction end to end.
 */
test.describe("Workout logging: sets, weight, reps, RIR", () => {
  test.afterEach(async ({ readyPage, supabaseAsTestUser }) => {
    await discardIfActive(readyPage);
    // Each Playwright test gets its own fresh browser context and therefore
    // its own fresh anonymous Supabase user (no real person ever uses this
    // id), so "delete every workout this user owns" is safe and simple —
    // RLS guarantees the delete can't touch any other user's data even if
    // the filter were wrong.
    const { data: mine } = await supabaseAsTestUser.from("workouts").select("id");
    if (mine?.length) {
      await supabaseAsTestUser.from("workouts").delete().in("id", mine.map((w) => w.id));
    }
  });

  test("happy path: start a workout, log a set with valid values, see it marked complete", { tag: "@smoke" }, async ({
    readyPage,
  }) => {
    await startTodaysWorkout(readyPage);
    await readyPage.getByRole("button", { name: "Increase weight" }).first().click();
    await readyPage.getByLabel("reps").first().fill("8");
    await readyPage.getByLabel("RIR").first().fill("2");
    await readyPage.getByRole("button", { name: /Complete set 1/ }).click();
    await expect(readyPage.getByText("1/", { exact: false }).first()).toBeVisible();
  });

  test("the Log button stays disabled/no-op until reps has a value (weight always has a valid default)", async ({ readyPage }) => {
    await startTodaysWorkout(readyPage);
    const logButton = readyPage.getByRole("button", { name: /Complete set 1/ });
    // Weight defaults to a valid value (20kg) via the stepper, so unlike the
    // old free-text field, an empty/invalid weight is no longer reachable —
    // reps is the only remaining non-empty gate.
    await expect(logButton).toBeDisabled();
    await readyPage.getByLabel("reps").first().fill("8");
    await expect(logButton).toBeEnabled();
  });

  test("reps field structurally rejects non-digit input on the real screen (not just the unit-tested function)", async ({ readyPage }) => {
    await startTodaysWorkout(readyPage);
    const repsField = readyPage.getByLabel("reps").first();
    await repsField.fill("-5abc9999");
    await expect(repsField).toHaveValue("999");
  });

  test("weight defaults to a sensible value and changes only in fixed half-kilogram steps", async ({ readyPage }) => {
    // Documents the fix: weight used to be free text (accepting letters,
    // decimals, negative numbers, NaN) — it's now a stepper that structurally
    // can't produce any of those invalid states. The step is 0.5kg (not 1kg)
    // specifically so it can represent every value the progression engine
    // can suggest (e.g. 82.5kg) — see PROGRESSION_LOGIC_AUDIT.md, Risk 1.
    await startTodaysWorkout(readyPage);
    const initial = await readWeightKg(readyPage);
    expect(initial, "default weight should be a sensible, valid starting point").toBe(20);

    await readyPage.getByRole("button", { name: "Increase weight" }).first().click();
    expect(await readWeightKg(readyPage)).toBe(initial + 0.5);

    await readyPage.getByRole("button", { name: "Decrease weight" }).first().click();
    await readyPage.getByRole("button", { name: "Decrease weight" }).first().click();
    expect(await readWeightKg(readyPage)).toBe(initial - 0.5);
  });

  test("weight cannot be decreased below zero via the stepper", async ({ readyPage }) => {
    await startTodaysWorkout(readyPage);
    const decrease = readyPage.getByRole("button", { name: "Decrease weight" }).first();
    // The button disables itself once weight hits 0 (default is 20, at
    // 0.5kg per click that's 40 clicks) — clicking a disabled button would
    // just hang waiting for it to re-enable, so stop as soon as it disables.
    for (let i = 0; i < 45 && (await decrease.isEnabled()); i++) await decrease.click();
    expect(await readWeightKg(readyPage), "weight should clamp at 0, never go negative").toBe(0);
    await expect(decrease).toBeDisabled();
  });
});

// @mobile: a real-device usability regression check, not a functional one —
// "technically clickable" in a browser isn't the same as usable with a real
// finger. Confirms the weight stepper's +/- buttons stay at or above the
// theme's own touchTarget.min (44px; see packages/config/src/tokens/
// touchTarget.ts) at an actual mobile viewport, not just that they exist.
test.describe("Mobile viewport — weight stepper touch targets", { tag: "@mobile" }, () => {
  test.use({ viewport: { width: 360, height: 800 } }); // a common, tighter Android width — the size this regressed at before

  test.afterEach(async ({ readyPage, supabaseAsTestUser }) => {
    await discardIfActive(readyPage);
    const { data: mine } = await supabaseAsTestUser.from("workouts").select("id");
    if (mine?.length) await supabaseAsTestUser.from("workouts").delete().in("id", mine.map((w) => w.id));
  });

  test("the weight stepper's +/- buttons meet the minimum real-finger touch target size", async ({ readyPage }) => {
    const MIN_TOUCH_TARGET_PX = 44;
    await startTodaysWorkout(readyPage);

    for (const label of ["Decrease weight", "Increase weight"]) {
      const box = await readyPage.getByRole("button", { name: label }).first().boundingBox();
      expect(box, `${label} button should be present and measurable`).not.toBeNull();
      if (box) {
        expect(box.width, `${label} width should meet the ${MIN_TOUCH_TARGET_PX}px minimum touch target`).toBeGreaterThanOrEqual(
          MIN_TOUCH_TARGET_PX,
        );
        expect(box.height, `${label} height should meet the ${MIN_TOUCH_TARGET_PX}px minimum touch target`).toBeGreaterThanOrEqual(
          MIN_TOUCH_TARGET_PX,
        );
      }
    }
  });
});
