import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProgram, deleteProgram } from "../lib/repositories/programRepository";
import { createExercise } from "../lib/repositories/exerciseRepository";
import { ensureSession } from "../lib/supabase/auth";
import { supabase } from "../lib/supabase/client";
import { SECURITY_PAYLOADS as BASE_PAYLOADS } from "../e2e/support/fuzz";
import type { ProgramId } from "@silver-fox/types";

/**
 * Moved from 18 Playwright tests (12 in programme-crud.spec.ts, 6 of 12 in
 * exercise-library.spec.ts — an arbitrary slice, since the full 12 would
 * have made an already-slow file slower) that each booted a full page and
 * waited a fixed 1.5-2s to prove a string round-trips through Postgres
 * unmodified. That's a persistence/escaping question, not a UI one —
 * Supabase-js parameterizes every insert, so whether it's a real risk has
 * nothing to do with React or a browser. This runs the exact same
 * repository functions the app uses, against the real (test) Supabase
 * project, with zero rendering. See E2E_PERFORMANCE_AUDIT.md §2.
 */
const RUN_TAG = `INTEG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Postgres text columns reject a literal null byte outright — a clean
// rejection is the correct, expected outcome for that one payload, not a bug.
const SECURITY_PAYLOADS = BASE_PAYLOADS.map((payload) => ({
  ...payload,
  expectRejection: payload.label === "null byte",
}));

beforeAll(async () => {
  await ensureSession();
}, 20_000);

describe("Programme name survives adversarial input safely (via createProgram, real Supabase)", () => {
  const createdIds: ProgramId[] = [];

  afterAll(async () => {
    for (const id of createdIds) await deleteProgram(id).catch(() => {});
  });

  for (const payload of SECURITY_PAYLOADS) {
    it(`programme name: ${payload.label}`, async () => {
      const name = `${RUN_TAG} ${payload.value}`.slice(0, 79);

      if (payload.expectRejection) {
        // Postgres text columns reject a literal null byte outright — a
        // clean rejection is the correct, expected outcome here, not a bug.
        await expect(createProgram({ name, dayNames: ["Day 1"] })).rejects.toThrow();
        return;
      }

      const detail = await createProgram({ name, dayNames: ["Day 1"] });
      createdIds.push(detail.program.id);

      const { data } = await supabase.from("programs").select("name").eq("id", detail.program.id).single();
      // No browser involved here (unlike the retired Playwright versions of
      // this test), so there's no HTML-input newline/tab-stripping quirk to
      // account for — the payload should round-trip byte-for-byte.
      expect(data?.name, `payload "${payload.label}" must round-trip unmodified`).toBe(name);
    });
  }
});

describe("Exercise name survives adversarial input safely (via createExercise, real Supabase)", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    if (createdIds.length) await supabase.from("exercises").delete().in("id", createdIds);
  });

  for (const payload of SECURITY_PAYLOADS) {
    it(`exercise name: ${payload.label}`, async () => {
      const name = `${RUN_TAG} ${payload.value}`.slice(0, 119);
      const input = {
        name,
        primaryMuscleGroup: "chest" as const,
        secondaryMuscleGroups: [],
        equipment: "barbell" as const,
        laterality: "bilateral" as const,
        description: "Integration test fixture.",
        instructions: [],
        formCues: [],
        commonMistakes: [],
      };

      if (payload.expectRejection) {
        await expect(createExercise(input)).rejects.toThrow();
        return;
      }

      const exercise = await createExercise(input);
      createdIds.push(exercise.id);

      const { data } = await supabase.from("exercises").select("name").eq("id", exercise.id).single();
      expect(data?.name, `payload "${payload.label}" must round-trip unmodified`).toBe(name);
    });
  }
});
