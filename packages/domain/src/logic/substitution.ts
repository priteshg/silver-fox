import type { Exercise } from "../entities/exercise";

/** A directional curated relationship — see `exercise_substitutions` in supabase/migrations. */
export interface CuratedSubstitution {
  exerciseId: string;
  substituteExerciseId: string;
}

export interface SubstitutionCandidate {
  exercise: Exercise;
  score: number;
  reason: string;
}

const SAME_PATTERN_POINTS = 3;
const MUSCLE_OVERLAP_POINTS = 2;
const SAME_LATERALITY_POINTS = 2;
const SAME_DIFFICULTY_POINTS = 1;
const CURATED_POINTS = 1;

function allMuscles(exercise: Exercise): Set<string> {
  return new Set([exercise.primaryMuscleGroup, ...exercise.secondaryMuscleGroups]);
}

function hasMuscleOverlap(a: Exercise, b: Exercise): boolean {
  const bMuscles = allMuscles(b);
  return [...allMuscles(a)].some((muscle) => bMuscles.has(muscle));
}

/**
 * Finds and ranks exercises that could stand in for `original`, per
 * EXERCISE_SUBSTITUTION_SPEC.md §5. Every filter and every scoring factor is
 * a fixed, named rule — nothing here is a trained or opaque model, and every
 * point a candidate earns is explainable (see `explainSubstitution`).
 *
 * `availableEquipment` is optional: when provided, candidates using
 * equipment outside that set are excluded (bodyweight is always allowed);
 * when omitted, no equipment filtering is applied at all.
 */
export function findSubstitutes(params: {
  original: Exercise;
  candidates: Exercise[];
  availableEquipment?: string[];
  curated?: CuratedSubstitution[];
}): SubstitutionCandidate[] {
  const { original, candidates, availableEquipment, curated = [] } = params;
  const curatedIds = new Set(
    curated.filter((c) => c.exerciseId === original.id).map((c) => c.substituteExerciseId),
  );

  const filtered = candidates.filter((candidate) => {
    if (candidate.id === original.id) return false;
    if (candidate.primaryMuscleGroup !== original.primaryMuscleGroup) return false;
    if (!candidate.movementPattern) return false;
    if (availableEquipment && candidate.equipment !== "bodyweight") {
      if (!availableEquipment.includes(candidate.equipment)) return false;
    }
    return true;
  });

  const scored = filtered.map((candidate) => {
    const isCurated = curatedIds.has(candidate.id);
    const samePattern = candidate.movementPattern === original.movementPattern;
    const sameLaterality = candidate.laterality === original.laterality;
    const muscleOverlap = hasMuscleOverlap(original, candidate);
    const sameDifficulty =
      candidate.difficulty === undefined ||
      original.difficulty === undefined ||
      candidate.difficulty === original.difficulty;

    let score = 0;
    if (samePattern) score += SAME_PATTERN_POINTS;
    if (muscleOverlap) score += MUSCLE_OVERLAP_POINTS;
    if (sameLaterality) score += SAME_LATERALITY_POINTS;
    if (sameDifficulty) score += SAME_DIFFICULTY_POINTS;
    if (isCurated) score += CURATED_POINTS;

    return {
      exercise: candidate,
      score,
      reason: explainSubstitution({
        original,
        candidate,
        samePattern,
        muscleOverlap,
        sameLaterality,
        isCurated,
      }),
    };
  });

  return scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
}

function movementPatternLabel(pattern: string): string {
  return pattern.replace(/_/g, " ");
}

/** Builds the plain-English reason for one candidate, from exactly the factors that matched — nothing hidden. */
function explainSubstitution(params: {
  original: Exercise;
  candidate: Exercise;
  samePattern: boolean;
  muscleOverlap: boolean;
  sameLaterality: boolean;
  isCurated: boolean;
}): string {
  const { original, candidate, samePattern, muscleOverlap, sameLaterality, isCurated } = params;
  const clauses: string[] = [];

  if (isCurated) {
    clauses.push(`is a coach-recommended substitute for ${original.name}`);
  }

  if (samePattern && candidate.movementPattern) {
    clauses.push(`trains the same ${movementPatternLabel(candidate.movementPattern)} movement pattern`);
  } else {
    clauses.push("trains the same primary muscle");
  }

  if (!samePattern) {
    clauses.push("uses a different movement pattern, so it's a looser match");
  }

  if (candidate.equipment !== original.equipment) {
    clauses.push(`uses ${candidate.equipment} instead of ${original.equipment}`);
  }

  if (!sameLaterality) {
    clauses.push(
      candidate.laterality === "unilateral"
        ? "trains one side at a time, unlike the original"
        : "trains both sides together, unlike the original",
    );
  }

  if (!muscleOverlap) {
    clauses.push("has no overlapping secondary muscles with the original");
  }

  const sentence = clauses.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}
