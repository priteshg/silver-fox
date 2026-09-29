import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures/bddFixtures";

const { When, Then } = createBdd(test);

/**
 * Shared verbatim across programmes.feature and exercise_library.feature —
 * each domain's own Given step ("I am creating a new programme" /
 * "I am creating a new exercise") sets `scenarioState.nameFieldLabel` first,
 * so these can't be duplicated per-file (playwright-bdd would treat the
 * identical step text as a conflicting redefinition).
 */
When("I leave the name blank", async () => {
  // The form already starts with an empty name field — nothing to do.
});

When("I try to enter a name longer than {int} characters", async ({ page, scenarioState }, limit: number) => {
  const label = scenarioState.nameFieldLabel as string;
  await page.getByLabel(label).fill("X".repeat(limit + 10));
});

Then("only the first {int} characters are accepted", async ({ page, scenarioState }, limit: number) => {
  const label = scenarioState.nameFieldLabel as string;
  const typed = await page.getByLabel(label).inputValue();
  expect(typed.length).toBeLessThanOrEqual(limit);
});
