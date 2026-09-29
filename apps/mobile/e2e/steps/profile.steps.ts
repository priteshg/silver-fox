import { createBdd } from "playwright-bdd";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "../fixtures/bddFixtures";
import type { HomePage } from "../pages/HomePage";
import type { ProfilePage } from "../pages/ProfilePage";

const { Given, When, Then, After } = createBdd(test);

/** Restores the profile to a clean slate so this file's scenarios don't leak into others — mirrors e2e/journeys/profile.spec.ts. */
async function resetProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ display_name: null, age: null, training_experience: null, goals: null })
    .eq("id", user.id);
}

After(async ({ cleanupSupabaseAsTestUser }) => {
  const supabase = await cleanupSupabaseAsTestUser();
  if (supabase) await resetProfile(supabase);
});

async function openProfile(page: Page, homePage: HomePage, profilePage: ProfilePage) {
  await homePage.goto("/");
  await homePage.goToProfile();
  await profilePage.waitForReady();
}

Given("I want PrimeForm to know I am at an intermediate training level", async ({ page, homePage, profilePage }) => {
  await openProfile(page, homePage, profilePage);
});

Given("I am updating my profile", async ({ page, homePage, profilePage }) => {
  await openProfile(page, homePage, profilePage);
});

When("I set my training experience to {string}", async ({ profilePage }, level: string) => {
  await profilePage.selectTrainingExperience(level as "beginner" | "intermediate" | "advanced");
  await profilePage.save();
  await expect(profilePage.savedConfirmation).toBeVisible({ timeout: 10_000 });
});

Then("my profile shows my training experience as {string}", async ({ supabaseAsTestUser }, level: string) => {
  const supabase = await supabaseAsTestUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("training_experience").eq("id", user!.id).single();
  expect(profile?.training_experience).toBe(level);
});

When("I try to set my age to {int}", async ({ profilePage }, age: number) => {
  await profilePage.setAge(String(age));
  await profilePage.save();
});

Then(/^my age is (accepted|not accepted)$/, async ({ profilePage, supabaseAsTestUser }, outcome: string) => {
  if (outcome === "accepted") {
    await expect(profilePage.savedConfirmation).toBeVisible({ timeout: 10_000 });
  } else {
    await expect(profilePage.ageRangeError).toBeVisible({ timeout: 10_000 });
  }

  const supabase = await supabaseAsTestUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("age").eq("id", user!.id).single();

  if (outcome === "accepted") {
    expect(profile?.age).not.toBeNull();
  } else {
    expect(profile?.age ?? null, "an out-of-range age must never be persisted").toBeNull();
  }
});
