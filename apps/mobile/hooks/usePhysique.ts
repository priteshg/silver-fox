import type { BodyMeasurement, ProgressPhoto } from "@silver-fox/domain";
import { useCallback, useEffect, useState } from "react";
import {
  addProgressPhoto,
  listBodyMeasurements,
  listProgressPhotos,
  logBodyMeasurement,
} from "../lib/repositories/physiqueRepository";

export function usePhysique() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [loadedMeasurements, loadedPhotos] = await Promise.all([listBodyMeasurements(), listProgressPhotos()]);
    setMeasurements([...loadedMeasurements].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setPhotos([...loadedPhotos].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logMeasurement = useCallback(
    async (input: { date: string; weightKg?: number; waistCm?: number; bodyFatPercent?: number }) => {
      await logBodyMeasurement(input);
      await refresh();
    },
    [refresh],
  );

  const addPhoto = useCallback(
    async (input: { date: string; uri: string; note?: string }) => {
      await addProgressPhoto(input);
      await refresh();
    },
    [refresh],
  );

  return { measurements, photos, isLoading, refresh, logMeasurement, addPhoto };
}
