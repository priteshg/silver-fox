import { expect, test, RUN_TAG } from "../support/fixtures";
import { recordFinding } from "../support/findings";

test.describe("Exercise selection and custom exercise creation", () => {
  test.afterEach(async ({ supabaseAsTestUser }) => {
    await supabaseAsTestUser.from("exercises").delete().ilike("name", `${RUN_TAG}%`);
  });

  test("browse the built-in library, search, and filter by muscle group and equipment", async ({ readyPage }) => {
    await readyPage.goto("/exercises");
    await expect(readyPage.getByText(/\d+ exercises/)).toBeVisible();

    await readyPage.getByLabel("Search").fill("squat");
    await expect(readyPage.getByText("Barbell Squat")).toBeVisible();
    await expect(readyPage.getByText("Bench Press")).toHaveCount(0);

    await readyPage.getByLabel("Search").fill("");
    await readyPage.getByText("legs", { exact: true }).click();
    await expect(readyPage.getByText("Barbell Squat")).toBeVisible();
    await expect(readyPage.getByText("Bench Press")).toHaveCount(0);
  });

  test("search with no matches shows an empty state, not a blank or broken screen", async ({ readyPage }) => {
    await readyPage.goto("/exercises");
    await readyPage.getByLabel("Search").fill("zzzznonexistentexercisezzzz");
    // The list should be empty but the screen must remain usable (filters still visible).
    await expect(readyPage.getByLabel("Search")).toBeVisible();
    await expect(readyPage.getByText(/\d+ exercises/)).toContainText("0 exercises");
  });

  test("happy path: create a custom exercise and see it in the library and its own detail page", async ({
    readyPage,
  }) => {
    const name = `${RUN_TAG} My Custom Curl`;
    await readyPage.goto("/exercises/new");
    await readyPage.getByLabel("Exercise Name").fill(name);
    // "back" appears in both the Primary and Secondary muscle group chip
    // lists; Primary renders first in the DOM, so .first() is the primary chip.
    await readyPage.getByText("back", { exact: true }).first().click();
    await readyPage.getByText("dumbbell", { exact: true }).first().click(); // equipment chip
    await readyPage.getByLabel("Description").fill("A test-created exercise.");
    await readyPage.getByRole("button", { name: "Save Exercise" }).click();

    await expect(readyPage.getByText(name)).toBeVisible({ timeout: 10_000 });

    await readyPage.goto("/exercises");
    await readyPage.getByLabel("Search").fill(name);
    await expect(readyPage.getByText(name)).toBeVisible();
  });

  test("cannot save a custom exercise with an empty name", async ({ readyPage }) => {
    await readyPage.goto("/exercises/new");
    await readyPage.getByLabel("Description").fill("no name given");
    await expect(readyPage.getByRole("button", { name: "Save Exercise" })).toBeDisabled();
  });

  // Adversarial-payload persistence safety moved to
  // integration/security-payloads.test.ts, covering the full 12-case list
  // (this file previously tested only an arbitrary slice of 6, since the
  // full list would have made an already-slow file slower) at a fraction
  // of the cost and without a browser. See E2E_PERFORMANCE_AUDIT.md §2.

  test("exercise name over the 120-char limit is truncated client-side and saves successfully within the limit", async ({
    readyPage,
    supabaseAsTestUser,
  }) => {
    // Fixed: exercises/new.tsx now caps the field at maxLength=120 (matching
    // the exercises.name CHECK constraint) instead of letting an over-length
    // name reach the DB and fail silently.
    const overLimit = `${RUN_TAG}_` + "Y".repeat(130);
    await readyPage.goto("/exercises/new");
    const nameField = readyPage.getByLabel("Exercise Name");
    await nameField.fill(overLimit);
    const typedValue = await nameField.inputValue();
    await readyPage.getByRole("button", { name: "Save Exercise" }).click();
    await expect(readyPage.getByText(overLimit.slice(0, 120))).toBeVisible({ timeout: 10_000 });

    const { data } = await supabaseAsTestUser.from("exercises").select("name").ilike("name", `${RUN_TAG}%`);
    const stored = data?.[0]?.name as string | undefined;

    if (typedValue.length > 120 || !stored || stored.length > 120) {
      recordFinding({
        journey: "Custom exercise creation — boundary (name length)",
        screen: "/exercises/new",
        action: "Type a name exceeding the 120-character DB constraint into Exercise Name",
        input: overLimit,
        expected: "The field accepts at most 120 characters, and the resulting exercise saves with that (truncated) name",
        actual: !stored
          ? "No exercise was created at all"
          : `Field allowed ${typedValue.length} characters; stored name is ${stored.length} characters long`,
        severity: "HIGH",
        reproSteps: ["Go to /exercises/new", "Fill Exercise Name with a 130+ character string", "Tap Save Exercise"],
      });
    }
    expect(typedValue.length, "the field should not accept more than 120 characters").toBeLessThanOrEqual(120);
    expect(stored, "a truncated, in-range name should save successfully, not fail silently").toBeTruthy();
    expect(stored?.length, "the stored name must respect the 120-character DB constraint").toBeLessThanOrEqual(120);
  });
});
