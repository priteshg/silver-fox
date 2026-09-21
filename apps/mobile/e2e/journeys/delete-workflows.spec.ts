import { expect, test, RUN_TAG } from "../support/fixtures";
import { recordFinding } from "../support/findings";
import { goToTab } from "../support/nav";

/**
 * Every delete/remove/discard action in this app (delete programme, remove
 * day, remove exercise from day, discard workout) is gated behind
 * `Alert.alert(...)`. react-native-web ships `Alert.alert` as a complete
 * no-op (`class Alert { static alert() {} }` — confirmed by reading the
 * installed package source earlier in this project), so on the web
 * platform tapping any of these buttons does *nothing at all*: no dialog,
 * no confirm, no cancel, no deletion. This is a genuine, structural gap in
 * what browser-based E2E (Playwright included, "Playwright MCP" or
 * otherwise) can verify for this specific app, not a suite limitation to
 * work around — the same buttons work correctly with real native dialogs
 * on Android/iOS, which was verified manually on a real device earlier in
 * this project. This spec documents the gap with a live, reproducible
 * check rather than leaving it as an assumption.
 */
test.describe("Delete/remove/discard workflows", () => {
  test.afterEach(async ({ supabaseAsTestUser }) => {
    await supabaseAsTestUser.from("programs").delete().ilike("name", `${RUN_TAG}%`);
  });

  test("KNOWN GAP: tapping Delete on a custom programme does nothing on web (Alert.alert is a no-op there)", async ({
    readyPage,
    supabaseAsTestUser,
  }) => {
    const name = `${RUN_TAG} Delete Me`;
    // Navigate in-app instead of `page.goto`, which forces a full document
    // reload (observed to sometimes exceed the test's 60s total budget).
    await goToTab(readyPage, "Programmes");
    await readyPage.getByText("+ Create a custom programme", { exact: true }).click();
    await readyPage.getByLabel("Programme Name").fill(name);
    await readyPage.getByRole("button", { name: "Create Programme" }).click();
    // expo-router keeps the previous (list) screen mounted underneath the
    // pushed detail screen, so the programme name text can match twice;
    // "Edit Details" only exists on the programme detail screen.
    await expect(readyPage.getByRole("button", { name: "Edit Details" })).toBeVisible({ timeout: 10_000 });

    await goToTab(readyPage, "Programmes");
    const deleteButton = readyPage.getByRole("button", { name: `Delete ${name}` });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Expected on a real device: a confirmation dialog appears. Actual on
    // web: nothing happens and the programme is still present untouched.
    // Alert.alert is a synchronous no-op on web, so there's no async
    // deletion in flight to wait out — checking now (with Playwright's own
    // auto-retry) is as reliable as waiting an arbitrary amount longer.
    const stillThere = await readyPage.getByText(name).isVisible();
    recordFinding({
      journey: "Delete workflows — platform testability gap",
      screen: "/programs",
      action: "Tap Delete on a custom programme card",
      expected: "A confirmation dialog appears (Cancel/Delete), and confirming removes the programme",
      actual: `No dialog appeared and no deletion occurred (Alert.alert is a no-op on react-native-web). Programme still present: ${stillThere}. This is expected on web and does not reproduce on real Android/iOS, where Alert.alert uses the native dialog.`,
      severity: "MEDIUM",
      reproSteps: [
        "Create a custom programme",
        "Go to /programs",
        "Tap 'Delete' on that programme's card",
        "Observe: no dialog appears, nothing happens",
      ],
    });
    expect(stillThere, "on web, Delete is a no-op — the programme should remain untouched, not silently vanish").toBe(true);

    // Real cleanup, bypassing the broken UI path, via direct repository access.
    await supabaseAsTestUser.from("programs").delete().eq("name", name);
  });
});

// Recommendation (not a test): react-native's Alert has no web
// implementation. Any destructive-action UI meant to work across platforms
// should use a custom cross-platform confirm — packages/ui already ships a
// Modal component (Modal.native.tsx / Modal.tsx) that could host one,
// rather than every screen calling Alert.alert directly.
