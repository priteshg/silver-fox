export type LoadProgressionAction = "increase" | "maintain" | "decrease";

export interface LoadSuggestion {
  action: LoadProgressionAction;
  /** null when there's no prior data to base a number on — start at a comfortable weight. */
  suggestedWeight: number | null;
  reason: string;
}

type MinimalLoggedSet = { weight: number; reps: number; rir?: number };

/**
 * Suggests next session's load for a single exercise, from that exercise's
 * own last-session sets — not a programme-wide rule. Mirrors real coaching
 * logic: only add weight once every set reaches the top of the rep range
 * without needing to dip under the prescribed RIR to get there; pull back
 * if a set fell short of the range; otherwise repeat the weight and build
 * up reps within the range first.
 */
export function suggestNextLoad(params: {
  previousSets: MinimalLoggedSet[];
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  targetRir?: number;
  incrementKg?: number;
}): LoadSuggestion {
  const { previousSets, targetRepRangeLow, targetRepRangeHigh, targetRir, incrementKg = 2.5 } = params;

  if (previousSets.length === 0) {
    return {
      action: "maintain",
      suggestedWeight: null,
      reason: "No previous data yet — start with a weight you can control for every rep.",
    };
  }

  const lastWeight = previousSets[previousSets.length - 1]!.weight;
  const allAtTopOfRange = previousSets.every((set) => set.reps >= targetRepRangeHigh);
  const anyBelowRange = previousSets.some((set) => set.reps < targetRepRangeLow);
  const rirOnTarget = targetRir === undefined || previousSets.every((set) => set.rir === undefined || set.rir >= targetRir);

  if (allAtTopOfRange && rirOnTarget) {
    return {
      action: "increase",
      suggestedWeight: roundToHalf(lastWeight + incrementKg),
      reason: `Every set reached ${targetRepRangeHigh} reps${targetRir !== undefined ? ` at ${targetRir}+ RIR` : ""} — add weight next session.`,
    };
  }

  if (anyBelowRange) {
    return {
      action: "decrease",
      suggestedWeight: roundToHalf(Math.max(0, lastWeight - incrementKg)),
      reason: `A set fell short of ${targetRepRangeLow} reps — ease back slightly next session.`,
    };
  }

  return {
    action: "maintain",
    suggestedWeight: lastWeight,
    reason: `In the ${targetRepRangeLow}-${targetRepRangeHigh} rep range but not at the top yet — repeat this weight and add reps.`,
  };
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
