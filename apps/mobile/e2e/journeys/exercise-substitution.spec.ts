import { expect, test } from "../support/fixtures";
import { goToTab } from "../support/nav";

/**
 * Foundation 40+ (the default seed programme every fresh test user starts
 * on) opens its "Push" day with Bench Press as the first exercise — see
 * data/programmeCatalogue.ts. Reusing this default, rather than creating a
 * bespoke programme per test, keeps these tests aligned with what a real
 * first-time user actually sees.
 */
async function startTodaysWorkout(page: import("@playwright/test").Page) {
  await goToTab(page, "Workouts");
  await page.getByRole("button", { name: /^Start /i }).first().click();
  await expect(page.getByRole("button", { name: "Finish workout" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Bench Press", { exact: true }).first()).toBeVisible();
}

async function discardIfActive(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.localStorage.removeItem("silverfox:activeSession"));
}

test.describe("Exercise substitution", () => {
  test.afterEach(async ({ readyPage, supabaseAsTestUser }) => {
    await discardIfActive(readyPage);
    const { data: mine } = await supabaseAsTestUser.from("workouts").select("id");
    if (mine?.length) {
      await supabaseAsTestUser.from("workouts").delete().in("id", mine.map((w) => w.id));
    }
  });

  test("shows suitable alternatives, constrained to the equipment available", async ({ readyPage }) => {
    await startTodaysWorkout(readyPage);
    await readyPage.getByRole("button", { name: "Swap exercise" }).click();
    await expect(readyPage.getByText("Replace Bench Press")).toBeVisible();

    // No equipment checked yet — an empty checklist means "I have no
    // equipment", so only the bodyweight option is offered (see
    // EXERCISE_SUBSTITUTION_SPEC.md §3).
    await expect(readyPage.getByText("Push-Up")).toBeVisible();
    await expect(readyPage.getByText("Machine Chest Press")).not.toBeVisible();

    await readyPage.getByRole("button", { name: "dumbbell", exact: true }).click();
    await expect(readyPage.getByText("Dumbbell Bench Press")).toBeVisible();
    await expect(readyPage.getByText("Push-Up")).toBeVisible();
    await expect(readyPage.getByText("Machine Chest Press")).not.toBeVisible();

    await readyPage.getByRole("button", { name: "machine", exact: true }).click();
    await expect(readyPage.getByText("Machine Chest Press")).toBeVisible();
  });

  test("substituting during a workout leaves the programme untouched, and history reflects what was actually performed", async ({
    readyPage,
    supabaseAsTestUser,
  }) => {
    await startTodaysWorkout(readyPage);
    await readyPage.getByRole("button", { name: "Swap exercise" }).click();
    await readyPage.getByRole("button", { name: "dumbbell", exact: true }).click();
    await readyPage.getByRole("button", { name: "Use Dumbbell Bench Press" }).click();

    // Back on the workout screen, the slot now performs the substitute. Both
    // the exercise-name heading and the exercise-tab chip now say "Dumbbell
    // Bench Press" (the chip appends a "(0/3)" set-count suffix) — match the
    // heading specifically with { exact: true } rather than either.
    await expect(readyPage.getByText("Dumbbell Bench Press", { exact: true })).toBeVisible();
    await expect(readyPage.getByText(/Substituted for Bench Press/)).toBeVisible();

    // The active-workout screen has no tab bar (by design — there's no
    // in-app way to "peek" at the programme mid-workout), so checking the
    // programme is untouched via direct data access rather than a UI
    // detour that would mean discarding the very workout under test.
    // Foundation 40+ is a built-in programme, so its rows are readable but
    // not owned by this test user — RLS's "readable when built-in" policy
    // covers this read regardless of which user performs it.
    const { data: benchPressExercise } = await supabaseAsTestUser
      .from("exercises")
      .select("id")
      .eq("name", "Bench Press")
      .single();
    const { data: programExercise } = await supabaseAsTestUser
      .from("program_exercises")
      .select("exercise_id")
      .eq("id", "program_ppl_day0_pe0")
      .single();
    expect(programExercise?.exercise_id, "the programme's Push day must still prescribe Bench Press").toBe(
      benchPressExercise?.id,
    );
  });

  test("cancelling a substitution leaves the workout unchanged", async ({ readyPage }) => {
    await startTodaysWorkout(readyPage);
    await readyPage.getByRole("button", { name: "Swap exercise" }).click();
    await readyPage.getByRole("button", { name: "Cancel" }).click();
    await expect(readyPage.getByText("Bench Press", { exact: true }).first()).toBeVisible();
  });

  test("substitution is no longer offered once a set has been logged for that exercise", async ({ readyPage }) => {
    await startTodaysWorkout(readyPage);
    await readyPage.getByLabel("reps").first().fill("8");
    await readyPage.getByRole("button", { name: /^Complete set/i }).first().click();
    await expect(readyPage.getByRole("button", { name: "Swap exercise" })).not.toBeVisible();
  });
});
