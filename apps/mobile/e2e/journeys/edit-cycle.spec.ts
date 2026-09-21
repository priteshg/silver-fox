import { expect, test, RUN_TAG } from "../support/fixtures";
import { recordFinding } from "../support/findings";
import { goToTab } from "../support/nav";

/**
 * The full create -> verify -> edit -> verify -> refresh -> verify -> edit
 * again -> verify-no-corruption cycle, run against a programme exercise's
 * configuration (sets/rep range/RIR/rest) — the entity in the app with the
 * most independently-editable numeric fields, making it the best vehicle
 * for checking that editing one field never corrupts a sibling field.
 */
test.describe("Edit cycle: programme exercise configuration", () => {
  let programId: string;

  test.afterEach(async ({ supabaseAsTestUser }) => {
    await supabaseAsTestUser.from("programs").delete().ilike("name", `${RUN_TAG}%`);
  });

  test("create, configure, edit, refresh-verify, edit again, and confirm no cross-field corruption", async ({
    readyPage,
  }) => {
    // This cycle includes a full reload (step 5), which alone takes ~30s;
    // leave enough room on top of everything else in this multi-stage test.
    test.setTimeout(150_000);

    // 1. Create a custom programme to configure within. Navigate in-app
    // (Programmes tab -> "+ Create a custom programme") instead of
    // `page.goto`, which forces a full document reload.
    await goToTab(readyPage, "Programmes");
    await readyPage.getByText("+ Create a custom programme", { exact: true }).click();
    await readyPage.getByLabel("Programme Name").fill(`${RUN_TAG} Edit Cycle`);
    await readyPage.getByRole("button", { name: "Create Programme" }).click();
    // expo-router keeps the previous (list) screen mounted underneath the
    // pushed detail screen, so the programme name text can match twice once
    // the list refetches; "Edit Details" only exists on the detail screen.
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });
    programId = new URL(readyPage.url()).pathname.split("/").pop()!;

    // 2. Add an exercise to the first day.
    await readyPage.getByRole("button", { name: "Add Exercise" }).click();
    await readyPage.getByText("Barbell Squat", { exact: true }).click();
    // "Barbell Squat" text is ambiguous here (picker list item + the new
    // configure screen's own exercise-name header, mid-transition can both
    // report hidden); the Target Sets stepper is unique to the configure
    // screen and is what the next step needs visible anyway.
    await expect(readyPage.getByLabel(/^Target Sets:/)).toBeVisible({ timeout: 10_000 });

    // 3. Configure initial values.
    await setStepper(readyPage, "Target Sets", 3, 4);
    await setStepper(readyPage, "Target Reps — Low", 8, 6);
    await setStepper(readyPage, "Target Reps — High", 12, 10);
    await setStepper(readyPage, "Target RIR", 2, 1);
    await readyPage.getByRole("button", { name: "Add to Day" }).click();
    await expect(readyPage.getByText("4 × 6-10")).toBeVisible({ timeout: 10_000 });

    // 4. Edit: open the exercise again and change only the rep range.
    await readyPage.getByText("Barbell Squat", { exact: true }).click();
    await setStepper(readyPage, "Target Reps — Low", 6, 8);
    await readyPage.getByRole("button", { name: "Save Changes" }).click();
    await expect(readyPage.getByText("4 × 8-10")).toBeVisible({ timeout: 10_000 });
    // Sets (4) and the untouched high end of the range should be unaffected.

    // 5. Refresh and re-verify the edited value persisted correctly.
    await readyPage.reload();
    await expect(readyPage.getByText("4 × 8-10")).toBeVisible({ timeout: 20_000 });

    // 6. Edit again — change target sets only.
    await readyPage.getByText("Barbell Squat", { exact: true }).click();
    await setStepper(readyPage, "Target Sets", 4, 3);
    await readyPage.getByRole("button", { name: "Save Changes" }).click();

    // 7. Confirm the second edit applied AND the first edit's rep range survived untouched.
    await expect(readyPage.getByText("3 × 8-10")).toBeVisible({ timeout: 10_000 });
  });

  test("rapid taps on a Stepper's Increase button can silently under-count", async ({ readyPage }) => {
    // Stepper.tsx's increment/decrement compute `onChange(value +/- step)`
    // from the closed-over `value` prop instead of a functional update, so
    // two clicks fired faster than a render cycle both read the same stale
    // value and can net +1 instead of +2. Discovered via this exact scenario
    // failing unexpectedly in the edit-cycle test above.
    await goToTab(readyPage, "Programmes");
    await readyPage.getByText("+ Create a custom programme", { exact: true }).click();
    await readyPage.getByLabel("Programme Name").fill(`${RUN_TAG} Stepper Race`);
    await readyPage.getByRole("button", { name: "Create Programme" }).click();
    // expo-router keeps the previous (list) screen mounted underneath the
    // pushed detail screen, so the programme name text matches in both
    // places; "Edit Details" only exists on the programme detail screen.
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });

    await readyPage.getByRole("button", { name: "Add Exercise" }).click();
    await readyPage.getByText("Barbell Squat", { exact: true }).click();
    await expect(readyPage.getByLabel(/^Target Sets:/)).toBeVisible({ timeout: 10_000 });

    // Fire two increments back-to-back with no wait in between (default is 3).
    const increase = readyPage.getByRole("button", { name: "Increase Target Sets" });
    await Promise.all([increase.click(), increase.click()]);

    async function readTargetSets() {
      const label = await readyPage.getByLabel(/^Target Sets:/).getAttribute("aria-label");
      return Number(label?.match(/Target Sets: (\d+)/)?.[1]);
    }
    // Poll instead of a fixed sleep: settles the instant React finishes
    // whichever render this race produces (correct +2 or buggy +1), rather
    // than always paying a fixed worst-case wait.
    await expect.poll(readTargetSets, { timeout: 5_000 }).toBeGreaterThan(3);
    const finalValue = await readTargetSets();
    if (finalValue !== 5) {
      recordFinding({
        journey: "Programme exercise configuration — Stepper rapid taps",
        screen: "/programs/[programId]/day/[dayId]/exercise/new",
        action: "Tap a Stepper's Increase button twice in rapid succession (starting value 3)",
        expected: "Value increases by 2, landing on 5",
        actual: `Value landed on ${finalValue} — a tap was silently dropped because Stepper.tsx's increment/decrement close over a stale \`value\` prop instead of using a functional update`,
        severity: "MEDIUM",
        reproSteps: [
          "Open any exercise's Target Sets/Reps/RIR stepper",
          "Click Increase twice as fast as possible (e.g. via a double-tap on a touchscreen)",
          "Observe the value increased by only 1, not 2",
        ],
      });
    }
    expect(finalValue, "two rapid Increase taps should net +2, not silently drop one").toBe(5);
  });
});

/**
 * Clicks a Stepper's +/- button `delta` times, waiting for the displayed
 * value to actually update between clicks. Stepper.tsx's increment/decrement
 * compute `onChange(value +/- step)` from the closed-over `value` prop rather
 * than a functional update, so firing clicks faster than a render cycle can
 * silently drop increments (see the dedicated "rapid stepper taps" test
 * below for the documented finding) — spacing clicks out here tests this
 * file's actual target (cross-field corruption) without tripping that bug.
 */
async function setStepper(page: import("@playwright/test").Page, label: string, from: number, to: number) {
  // The configure-exercise screen briefly shows default placeholder values
  // before the real existing values load and overwrite them; clicking before
  // that settles would race the load and get silently clobbered.
  await page.getByLabel(`${label}: ${from}`).waitFor({ timeout: 10_000 });
  const delta = to - from;
  const buttonLabel = delta > 0 ? `Increase ${label}` : `Decrease ${label}`;
  let current = from;
  for (let i = 0; i < Math.abs(delta); i++) {
    await page.getByRole("button", { name: buttonLabel }).click();
    current += delta > 0 ? 1 : -1;
    await page.getByLabel(`${label}: ${current}`).waitFor({ timeout: 5_000 });
  }
}
