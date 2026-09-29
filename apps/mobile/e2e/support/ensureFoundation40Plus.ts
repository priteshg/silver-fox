import type { ProgrammesPage } from "../pages/ProgrammesPage";
import type { WorkoutPage } from "../pages/WorkoutPage";

/**
 * Ensures Foundation 40+ (the flagship built-in programme, with real
 * exercises) is this worker's active programme, then switches to the
 * Workouts tab via in-app tab navigation (not workoutPage.open(), which
 * does a full page.goto("/") reload) — chaining two full reloads back to
 * back (one for the Programmes-tab visit, one for Workouts) raced the
 * app's own auth/session-restoration on the second reload, confirmed
 * directly: it intermittently left "Start Push" clickable-looking but
 * structurally inert, with no visible error and no navigation on click.
 *
 * Every step file whose precondition assumes a real, startable "Push" day
 * (with exercises) must call this rather than `workoutPage.open()` alone —
 * this worker's account is reused across every scenario it runs (see
 * bddFixtures.ts), and a scenario elsewhere that made a *different*,
 * empty-days custom programme active (e.g. workout_history.steps.ts's "I
 * later change the programme") leaves that as the active programme for
 * every later scenario too. Confirmed directly: without this guard, a
 * later scenario assuming Foundation 40+ saw a genuinely, durably disabled
 * "Start Push" — an empty day's own Start button, not a transient race —
 * because nothing had switched the active programme back.
 */
export async function ensureFoundation40PlusActiveThenGoToWorkouts(
  programmesPage: ProgrammesPage,
  workoutPage: WorkoutPage,
): Promise<void> {
  await programmesPage.open();
  if (!(await programmesPage.isActiveOnList("Foundation 40+"))) {
    await programmesPage.makeMyProgrammeFromList("Foundation 40+");
  }
  await programmesPage.goToTab("Workouts");
  await workoutPage.waitForReady();
}
