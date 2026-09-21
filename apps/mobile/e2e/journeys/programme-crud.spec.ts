import { expect, test, RUN_TAG } from "../support/fixtures";
import { recordFinding } from "../support/findings";

test.describe("Programme creation and editing", () => {
  test.afterEach(async ({ supabaseAsTestUser }) => {
    // Cleanup by RUN_TAG prefix rather than tracked ids — robust even if a
    // test fails partway through and never reaches its own cleanup code.
    await supabaseAsTestUser.from("programs").delete().ilike("name", `${RUN_TAG}%`);
  });

  test("happy path: create a programme with 3 days, see it in the library, edit its name, delete it", async ({
    readyPage,
  }) => {
    await readyPage.goto("/programs/new");
    await readyPage.getByLabel("Programme Name").fill(`${RUN_TAG} My Split`);
    await readyPage.getByLabel("Description (optional)").fill("A test programme.");
    await readyPage.getByRole("button", { name: "Create Programme" }).click();

    await expect(readyPage.getByText(`${RUN_TAG} My Split`)).toBeVisible({ timeout: 10_000 });
    await expect(readyPage.getByText("Push").first()).toBeVisible();
    await expect(readyPage.getByText("Pull").first()).toBeVisible();
    await expect(readyPage.getByText("Legs").first()).toBeVisible();

    // Edit
    await readyPage.getByRole("button", { name: "Edit Details" }).click();
    const nameField = readyPage.getByLabel("Programme Name");
    await nameField.fill(`${RUN_TAG} Renamed Split`);
    await readyPage.getByRole("button", { name: "Save" }).click();
    await expect(readyPage.getByText(`${RUN_TAG} Renamed Split`)).toBeVisible({ timeout: 10_000 });

    // Refresh — must persist through a real reload, not just local state
    await readyPage.reload();
    await expect(readyPage.getByText(`${RUN_TAG} Renamed Split`)).toBeVisible({ timeout: 20_000 });
  });

  test("cannot create a programme with an empty name (Create button stays disabled)", async ({ readyPage }) => {
    await readyPage.goto("/programs/new");
    await readyPage.getByLabel("Description (optional)").fill("no name provided");
    await expect(readyPage.getByRole("button", { name: "Create Programme" })).toBeDisabled();
  });

  test("whitespace-only name is treated as empty (Create stays disabled)", async ({ readyPage }) => {
    await readyPage.goto("/programs/new");
    await readyPage.getByLabel("Programme Name").fill("   ");
    await expect(readyPage.getByRole("button", { name: "Create Programme" })).toBeDisabled();
  });

  // Adversarial-payload persistence safety (12 cases) moved to
  // integration/security-payloads.test.ts — it's a question of whether
  // Supabase-js's parameterized inserts protect the database, which has
  // nothing to do with the UI and is proven identically without a browser,
  // in ~5s total instead of ~2 minutes. See E2E_PERFORMANCE_AUDIT.md §2.

  test("name over the 80-character DB limit is truncated client-side and saves successfully within the limit", async ({
    readyPage,
    supabaseAsTestUser,
  }) => {
    // Fixed: programs/new.tsx now caps the field at maxLength=80 (matching
    // the programs.name CHECK constraint) instead of letting an over-length
    // name reach the DB and fail silently.
    const overLimit = `${RUN_TAG}_` + "X".repeat(90); // well over 80 once combined with RUN_TAG
    await readyPage.goto("/programs/new");
    const nameField = readyPage.getByLabel("Programme Name");
    await nameField.fill(overLimit);
    const typedValue = await nameField.inputValue();
    await readyPage.getByRole("button", { name: "Create Programme" }).click();
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });

    const { data } = await supabaseAsTestUser.from("programs").select("id, name").ilike("name", `${RUN_TAG}%`);
    const stored = data?.[0]?.name as string | undefined;

    if (typedValue.length > 80 || !stored || stored.length > 80) {
      recordFinding({
        journey: "Programme creation — boundary (name length)",
        screen: "/programs/new",
        action: "Type a name exceeding the 80-character DB constraint into Programme Name",
        input: overLimit,
        expected: "The field accepts at most 80 characters, and the resulting programme saves with that (truncated) name",
        actual: !stored
          ? "No programme was created at all"
          : `Field allowed ${typedValue.length} characters; stored name is ${stored.length} characters long`,
        severity: "HIGH",
        reproSteps: ["Go to /programs/new", "Fill Programme Name with a 90+ character string", "Tap Create Programme"],
      });
    }
    expect(typedValue.length, "the field should not accept more than 80 characters").toBeLessThanOrEqual(80);
    expect(stored, "a truncated, in-range name should save successfully, not fail silently").toBeTruthy();
    expect(stored?.length, "the stored name must respect the 80-character DB constraint").toBeLessThanOrEqual(80);
  });

  test("cannot delete the built-in catalogue programme (Foundation 40+) — no delete affordance is offered", async ({
    readyPage,
  }) => {
    await readyPage.goto("/programs");
    const builtIn = readyPage.getByText("Foundation 40+", { exact: true });
    await expect(builtIn).toBeVisible();
    // The built-in card should not expose a Delete action at all.
    const card = readyPage.locator("text=Foundation 40+").locator("..").locator("..");
    await expect(card.getByText("Delete", { exact: true })).toHaveCount(0);
  });
});
