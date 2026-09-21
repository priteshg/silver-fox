import type { BodyMeasurement, ProgressPhoto } from "@silver-fox/domain";
import { createId } from "@silver-fox/types";
import { getCurrentUserIdSync } from "../supabase/auth";
import { supabase } from "../supabase/client";

interface BodyMeasurementRow {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  body_fat_percent: number | null;
  created_at: string;
  updated_at: string;
}

interface ProgressPhotoRow {
  id: string;
  user_id: string;
  date: string;
  uri: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function measurementRowToDomain(row: BodyMeasurementRow): BodyMeasurement {
  return {
    id: row.id as BodyMeasurement["id"],
    userId: row.user_id as BodyMeasurement["userId"],
    date: row.date,
    weightKg: row.weight_kg ?? undefined,
    waistCm: row.waist_cm ?? undefined,
    bodyFatPercent: row.body_fat_percent ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function photoRowToDomain(row: ProgressPhotoRow): ProgressPhoto {
  return {
    id: row.id as ProgressPhoto["id"],
    userId: row.user_id as ProgressPhoto["userId"],
    date: row.date,
    uri: row.uri,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBodyMeasurements(): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase.from("body_measurements").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(measurementRowToDomain);
}

export async function logBodyMeasurement(input: {
  date: string;
  weightKg?: number;
  waistCm?: number;
  bodyFatPercent?: number;
}): Promise<BodyMeasurement> {
  const userId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const measurement: BodyMeasurement = {
    id: createId("measurement") as BodyMeasurement["id"],
    userId,
    date: input.date,
    weightKg: input.weightKg,
    waistCm: input.waistCm,
    bodyFatPercent: input.bodyFatPercent,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("body_measurements").insert({
    id: measurement.id,
    user_id: userId,
    date: measurement.date,
    weight_kg: measurement.weightKg ?? null,
    waist_cm: measurement.waistCm ?? null,
    body_fat_percent: measurement.bodyFatPercent ?? null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  return measurement;
}

export async function listProgressPhotos(): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase.from("progress_photos").select("*").order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(photoRowToDomain);
}

export async function addProgressPhoto(input: { date: string; uri: string; note?: string }): Promise<ProgressPhoto> {
  const userId = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const photo: ProgressPhoto = {
    id: createId("photo") as ProgressPhoto["id"],
    userId,
    date: input.date,
    uri: input.uri,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("progress_photos").insert({
    id: photo.id,
    user_id: userId,
    date: photo.date,
    uri: photo.uri,
    note: photo.note ?? null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  return photo;
}
