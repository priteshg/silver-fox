import { describe, expect, it } from "vitest";
import { bodyMeasurementSchema, conditioningSessionSchema, userSchema, workoutDaySchema, workoutSetSchema } from "../schemas/entities";

describe("userSchema", () => {
  it("accepts a valid user", () => {
    const result = userSchema.safeParse({
      id: "user_1",
      displayName: "Ada",
      email: "ada@example.com",
      preferredWeightUnit: "kg",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = userSchema.safeParse({
      id: "user_1",
      displayName: "Ada",
      email: "not-an-email",
      preferredWeightUnit: "kg",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("workoutSetSchema", () => {
  it("rejects negative weight", () => {
    const result = workoutSetSchema.safeParse({
      id: "set_1",
      workoutId: "workout_1",
      exerciseId: "exercise_1",
      order: 0,
      weight: -10,
      weightUnit: "kg",
      reps: 8,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("workoutDaySchema", () => {
  it("requires a strength focus", () => {
    const result = workoutDaySchema.safeParse({
      id: "day_1",
      programId: "program_1",
      name: "Push",
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a focus outside the known set", () => {
    const result = workoutDaySchema.safeParse({
      id: "day_1",
      programId: "program_1",
      name: "Push",
      order: 0,
      focus: "cardio",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid focus", () => {
    const result = workoutDaySchema.safeParse({
      id: "day_1",
      programId: "program_1",
      name: "Push",
      order: 0,
      focus: "push",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("conditioningSessionSchema", () => {
  it("rejects a duration of zero", () => {
    const result = conditioningSessionSchema.safeParse({
      id: "conditioning_1",
      userId: "user_1",
      type: "zone2",
      date: "2026-01-01T00:00:00.000Z",
      durationMinutes: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid conditioning session without notes", () => {
    const result = conditioningSessionSchema.safeParse({
      id: "conditioning_1",
      userId: "user_1",
      type: "running",
      date: "2026-01-01T00:00:00.000Z",
      durationMinutes: 30,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("bodyMeasurementSchema", () => {
  it("accepts a measurement with only a weight", () => {
    const result = bodyMeasurementSchema.safeParse({
      id: "measurement_1",
      userId: "user_1",
      date: "2026-01-01T00:00:00.000Z",
      weightKg: 82.5,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a body fat percentage over 100", () => {
    const result = bodyMeasurementSchema.safeParse({
      id: "measurement_1",
      userId: "user_1",
      date: "2026-01-01T00:00:00.000Z",
      bodyFatPercent: 150,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
