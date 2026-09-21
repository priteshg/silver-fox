import type { ProgramId } from "@silver-fox/types";
import { beforeEach, describe, expect, it } from "vitest";
import { resetFakeDb } from "../../../test/fakeSupabase";
import { fakeSupabaseDb, TEST_USER_ID } from "../../../vitest.setup";
import { getProfile, setActiveProgramId, updateProfile } from "../userRepository";

const now = "2026-01-01T00:00:00.000Z";

describe("userRepository", () => {
  beforeEach(() => {
    resetFakeDb(fakeSupabaseDb);
    // Mirrors the row the `handle_new_auth_user` trigger creates automatically
    // on real sign-in — every profile starts out this bare.
    fakeSupabaseDb.profiles = [
      {
        id: TEST_USER_ID,
        display_name: null,
        email: null,
        age: null,
        preferred_weight_unit: "kg",
        training_experience: null,
        goals: null,
        preferred_training_days_per_week: null,
        available_equipment: null,
        active_program_id: null,
        created_at: now,
        updated_at: now,
      },
    ];
  });

  it("reads back the auto-created profile with sensible defaults", async () => {
    const profile = await getProfile();
    expect(profile.id).toBe(TEST_USER_ID);
    expect(profile.preferredWeightUnit).toBe("kg");
    expect(profile.age).toBeUndefined();
    expect(profile.activeProgramId).toBeUndefined();
  });

  it("persists profile updates and returns the updated row", async () => {
    const updated = await updateProfile({
      age: 45,
      trainingExperience: "intermediate",
      goals: ["get_stronger", "longevity"],
      preferredTrainingDaysPerWeek: 4,
      availableEquipment: ["barbell", "dumbbell"],
    });

    expect(updated.age).toBe(45);
    expect(updated.trainingExperience).toBe("intermediate");
    expect(updated.goals).toEqual(["get_stronger", "longevity"]);
    expect(updated.preferredTrainingDaysPerWeek).toBe(4);
    expect(updated.availableEquipment).toEqual(["barbell", "dumbbell"]);

    const reread = await getProfile();
    expect(reread.age).toBe(45);
  });

  it("stores the active programme choice on the profile, not device storage", async () => {
    await setActiveProgramId("program_custom_1" as ProgramId);
    const profile = await getProfile();
    expect(profile.activeProgramId).toBe("program_custom_1");
  });
});
