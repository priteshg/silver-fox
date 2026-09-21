export const MIN_AGE = 13;
export const MAX_AGE = 120;

/** Matches the profiles.age CHECK constraint (supabase/migrations). */
export function isAgeInRange(age: number): boolean {
  return age >= MIN_AGE && age <= MAX_AGE;
}
