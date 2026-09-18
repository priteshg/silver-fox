import type { BodyMeasurement, ProgressPhoto } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { bodyMeasurementsStorageSchema, progressPhotosStorageSchema } from "@silver-fox/validation";
import { LOCAL_USER_ID } from "../../data/currentUser";
import { readJson, writeJson } from "../storage/asyncStore";
import { STORAGE_KEYS } from "../storage/keys";

export async function listBodyMeasurements(): Promise<BodyMeasurement[]> {
  const raw = await readJson(STORAGE_KEYS.bodyMeasurements);
  if (raw === null) return [];
  const parsed = bodyMeasurementsStorageSchema.safeParse(raw);
  return parsed.success ? (parsed.data as BodyMeasurement[]) : [];
}

export async function logBodyMeasurement(input: {
  date: string;
  weightKg?: number;
  waistCm?: number;
  bodyFatPercent?: number;
}): Promise<BodyMeasurement> {
  const measurements = await listBodyMeasurements();
  const now = new Date().toISOString();
  const measurement: BodyMeasurement = {
    id: createId("measurement") as BodyMeasurement["id"],
    userId: LOCAL_USER_ID,
    date: input.date,
    weightKg: input.weightKg,
    waistCm: input.waistCm,
    bodyFatPercent: input.bodyFatPercent,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(STORAGE_KEYS.bodyMeasurements, [...measurements, measurement]);
  return measurement;
}

export async function listProgressPhotos(): Promise<ProgressPhoto[]> {
  const raw = await readJson(STORAGE_KEYS.progressPhotos);
  if (raw === null) return [];
  const parsed = progressPhotosStorageSchema.safeParse(raw);
  return parsed.success ? (parsed.data as ProgressPhoto[]) : [];
}

export async function addProgressPhoto(input: { date: string; uri: string; note?: string }): Promise<ProgressPhoto> {
  const photos = await listProgressPhotos();
  const now = new Date().toISOString();
  const photo: ProgressPhoto = {
    id: createId("photo") as ProgressPhoto["id"],
    userId: LOCAL_USER_ID,
    date: input.date,
    uri: input.uri,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(STORAGE_KEYS.progressPhotos, [...photos, photo]);
  return photo;
}
