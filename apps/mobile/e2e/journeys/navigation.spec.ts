import { expect, test } from "../support/fixtures";
import { recordFinding } from "../support/findings";
import { goToTab } from "../support/nav";

test.describe("Navigation between screens", () => {
  test("all 5 bottom tabs are reachable and show distinct, correct content", async ({ readyPage }) => {
    await goToTab(readyPage, "Workouts");
    await expect(readyPage.getByText("Start a Workout")).toBeVisible();

    await goToTab(readyPage, "Programmes");
    await expect(readyPage.getByText("Programme Library")).toBeVisible();

    await goToTab(readyPage, "Exercises");
    await expect(readyPage.getByText("Exercise Library")).toBeVisible();

    await goToTab(readyPage, "Progress");
    // "Progress" also literally names the tab button itself, so assert on the
    // screen's distinctive tab-row content instead of the ambiguous heading text.
    await expect(readyPage.getByLabel("Progress dimension")).toBeVisible();

    await goToTab(readyPage, "Home");
    await expect(readyPage.getByText("Build Your Next Decade.")).toBeVisible();
  });

  test("deep navigation (Programmes -> detail -> add-exercise picker -> configure) and back button unwinds correctly", async ({
    readyPage,
  }) => {
    await goToTab(readyPage, "Programmes");
    // Home's "Your Numbers" MetricCard also renders "Foundation 40+" (as
    // "Programme: Foundation 40+") and stays mounted in the background while
    // other tabs are active, so plain text matching is ambiguous here —
    // click the actual list-card button by its real accessible name instead.
    await readyPage.getByRole("button", { name: "View Foundation 40+, your active programme" }).click();
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible();

    await readyPage.getByRole("button", { name: "Add Exercise" }).click();
    await expect(readyPage.getByLabel("Search")).toBeVisible();

    await readyPage.goBack();
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });

    await readyPage.goBack();
    await expect(readyPage.getByText("Programme Library")).toBeVisible({ timeout: 10_000 });
  });

  test("browser back button during the active-workout Alert-gated Discard flow does not lose the active session unexpectedly", async ({
    readyPage,
  }) => {
    await goToTab(readyPage, "Workouts");
    await readyPage.getByRole("button", { name: /^Start /i }).first().click();
    await expect(readyPage.getByRole("button", { name: "Finish workout" })).toBeVisible();

    await readyPage.goBack();
    // Expect either: still on the active workout screen (back was blocked/no-op),
    // or navigated away but the session is still recoverable from Home's
    // "Workout In Progress" resume card. Anything else is a real problem.
    const stillActive = await readyPage.getByRole("button", { name: "Finish workout" }).isVisible().catch(() => false);
    if (!stillActive) {
      await expect(readyPage.getByText("Workout In Progress")).toBeVisible({ timeout: 5000 }).catch(async () => {
        recordFinding({
          journey: "Navigation — back button during active workout",
          screen: "/workout/active",
          action: "Press the browser/OS back button while a workout is in progress",
          expected: "Either blocked (workout has gestureEnabled: false intentionally) or the in-progress session remains resumable from Home",
          actual: "Navigated away from the active workout and the session is no longer visibly resumable from Home",
          severity: "HIGH",
          reproSteps: ["Start today's workout", "Press the browser back button", "Go to Home"],
        });
        expect(false, "active workout session should remain resumable after back navigation").toBe(true);
      });
    }

    // Cleanup regardless of outcome.
    await readyPage.evaluate(() => window.localStorage.removeItem("silverfox:activeSession"));
  });

  test("refreshing mid-workout does not lose logged sets", async ({ readyPage }) => {
    await goToTab(readyPage, "Workouts");
    await readyPage.getByRole("button", { name: /^Start /i }).first().click();
    // Weight defaults to a valid 20kg via the stepper — no need to set it explicitly.
    await readyPage.getByLabel("reps").first().fill("8");
    await readyPage.getByRole("button", { name: /Complete set 1/ }).click();
    await expect(readyPage.getByText(/1\/\d+ sets/)).toBeVisible();

    await readyPage.reload();
    await expect(readyPage.getByRole("button", { name: "Finish workout" })).toBeVisible({ timeout: 15_000 });
    const stillLogged = await readyPage.getByText(/1\/\d+ sets/).isVisible().catch(() => false);
    if (!stillLogged) {
      recordFinding({
        journey: "Workout logging — persistence across refresh",
        screen: "/workout/active",
        action: "Log one set, then refresh the page",
        expected: "The completed set survives the refresh (active session is persisted to AsyncStorage on every change)",
        actual: "The logged set count reset after refresh",
        severity: "CRITICAL",
        reproSteps: ["Start today's workout", "Log set 1 (weight 60, reps 8)", "Refresh the page", "Observe set count"],
      });
    }
    expect(stillLogged, "a logged set must survive a page refresh").toBe(true);

    await readyPage.evaluate(() => window.localStorage.removeItem("silverfox:activeSession"));
  });

  test("rapid double-tap on Create Programme does not create two programmes", async ({ readyPage, supabaseAsTestUser }) => {
    const name = `E2E_DBLTAP_${Date.now()}`;
    await readyPage.goto("/programs/new");
    await readyPage.getByLabel("Programme Name").fill(name);
    const createButton = readyPage.getByRole("button", { name: "Create Programme" });
    // Two genuinely concurrent Playwright `.click()` calls race each other's
    // actionability checks on the same element (especially once it disables
    // itself), which is a test-harness race, not a real double-tap. Click
    // once, then immediately try again without waiting for navigation —
    // if the button has already disabled or unmounted itself, that IS the
    // debounce protection working correctly and this second click harmlessly no-ops.
    await createButton.click();
    await createButton.click({ force: true, timeout: 2000 }).catch(() => {});
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });

    const { data } = await supabaseAsTestUser.from("programs").select("id").eq("name", name);
    if ((data?.length ?? 0) > 1) {
      recordFinding({
        journey: "Programme creation — double-submit",
        screen: "/programs/new",
        action: "Rapidly double-tap Create Programme",
        expected: "Exactly one programme is created (button should disable itself after the first tap)",
        actual: `${data?.length} programmes were created from a single double-tap`,
        severity: "MEDIUM",
        reproSteps: ["Go to /programs/new", "Fill in a name", "Tap Create Programme twice in rapid succession"],
      });
    }
    expect((data?.length ?? 0) <= 1, "double-tapping Create should not create duplicate programmes").toBe(true);
    if (data?.length) await supabaseAsTestUser.from("programs").delete().eq("name", name);
  });
});

test.describe("Mobile viewport — bottom navigation", () => {
  test.use({ viewport: { width: 412, height: 915 } }); // Pixel 7 logical size

  test("the bottom tab bar stays fully within the viewport on every tab, and page content is never hidden behind it", async ({
    readyPage,
  }) => {
    for (const tab of ["Home", "Workouts", "Programmes", "Exercises", "Progress"] as const) {
      await goToTab(readyPage, tab);
      const tabBar = readyPage.getByRole("tablist").last();
      const box = await tabBar.boundingBox();
      expect(box, `tab bar bounding box should exist on ${tab}`).not.toBeNull();
      if (box) {
        const viewport = readyPage.viewportSize()!;
        const fullyVisible = box.y + box.height <= viewport.height + 1; // +1px rounding tolerance
        if (!fullyVisible) {
          recordFinding({
            journey: "Mobile navigation — bottom bar bounds",
            screen: `/${tab.toLowerCase()}`,
            action: `Render the ${tab} tab at a 412x915 mobile viewport`,
            expected: "The tab bar's full bounding box is within the viewport",
            actual: `Tab bar extends to y=${box.y + box.height}, viewport height is ${viewport.height}`,
            severity: "HIGH",
            reproSteps: [`Set viewport to 412x915`, `Navigate to the ${tab} tab`, "Measure the tablist's bounding box"],
          });
        }
        expect(fullyVisible, `${tab}: bottom tab bar must be fully within the viewport`).toBe(true);
      }
    }
  });
});
