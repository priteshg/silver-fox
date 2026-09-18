/**
 * Estimates a one-rep max using the Epley formula.
 * Returns the raw weight when a single rep was performed.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) {
    throw new RangeError("weight and reps must be positive");
  }
  if (reps === 1) {
    return weight;
  }
  return weight * (1 + reps / 30);
}
