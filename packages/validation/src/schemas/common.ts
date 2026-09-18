import { z } from "zod";

export const timestampedSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const weightUnitSchema = z.enum(["kg", "lb"]);
