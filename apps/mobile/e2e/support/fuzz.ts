/**
 * Shared catalog of boundary, malformed and adversarial input values. Each
 * entry states what a *correct* application should do with it, so a spec
 * can assert intent rather than just "didn't crash". Values and their
 * `expect` verdicts are derived from the actual schema/constraints in
 * supabase/migrations and packages/validation, not guessed — see each
 * section's comment for the source of truth.
 */

export type ExpectedOutcome = "accept" | "reject";

export interface FuzzCase<T = string> {
  label: string;
  value: T;
  expect: ExpectedOutcome;
  /** Why this verdict — points at the concrete rule being exercised. */
  reason: string;
}

// --- Weight (kg) --------------------------------------------------------
// Source of truth: workout_sets.weight numeric not null check (weight >= 0)
// (supabase/migrations/20260918213648_workouts.sql). No upper bound exists
// in the schema — deliberately, since a strongman's max lift is unbounded —
// so very large values are technically schema-valid; whether the *UI*
// should sanity-cap them is one of this suite's open questions, flagged in
// the report rather than assumed.
export const WEIGHT_CASES: FuzzCase[] = [
  { label: "zero", value: "0", expect: "accept", reason: "0 kg is a valid bodyweight-only set" },
  { label: "typical decimal", value: "62.5", expect: "accept", reason: "normal plate-loaded increment" },
  { label: "negative", value: "-10", expect: "reject", reason: "weight >= 0 constraint" },
  { label: "huge value", value: "999999", expect: "reject", reason: "no human lifts 999t; UI should sanity-cap even though the DB doesn't" },
  { label: "excess decimal precision", value: "62.123456", expect: "reject", reason: "kg is never meaningfully precise beyond 1-2 decimals" },
  { label: "letters", value: "abc", expect: "reject", reason: "not numeric" },
  { label: "symbols", value: "62.5kg", expect: "reject", reason: "not a bare number" },
  { label: "whitespace only", value: "   ", expect: "reject", reason: "empty/blank" },
  { label: "empty", value: "", expect: "reject", reason: "required field" },
];

// --- Reps -----------------------------------------------------------------
// Source of truth: workout_sets.reps integer not null check (reps >= 0).
export const REPS_CASES: FuzzCase[] = [
  { label: "zero", value: "0", expect: "accept", reason: "a failed/attempted rep can legitimately be logged as 0" },
  { label: "one", value: "1", expect: "accept", reason: "minimum meaningful rep count" },
  { label: "typical", value: "10", expect: "accept", reason: "normal working-set rep count" },
  { label: "negative", value: "-5", expect: "reject", reason: "reps >= 0 constraint" },
  { label: "decimal", value: "8.5", expect: "reject", reason: "reps is an integer column" },
  { label: "huge value", value: "100000", expect: "reject", reason: "no set has 100,000 reps; UI should sanity-cap" },
  { label: "letters", value: "ten", expect: "reject", reason: "not numeric" },
  { label: "symbols", value: "10x", expect: "reject", reason: "not a bare integer" },
  { label: "whitespace only", value: " ", expect: "reject", reason: "empty/blank" },
  { label: "empty", value: "", expect: "reject", reason: "required field" },
];

// --- RIR (reps in reserve) -------------------------------------------------
// Source of truth: workout_sets.rir numeric check (rir between 0 and 10)
// (nullable — RIR is optional per set).
export const RIR_CASES: FuzzCase[] = [
  { label: "minimum (0)", value: "0", expect: "accept", reason: "0 RIR = trained to failure, valid" },
  { label: "maximum (10)", value: "10", expect: "accept", reason: "upper bound of the CHECK constraint" },
  { label: "typical", value: "2", expect: "accept", reason: "the app's own coaching philosophy targets 2-3 RIR" },
  { label: "below minimum", value: "-1", expect: "reject", reason: "rir between 0 and 10 constraint" },
  { label: "above maximum", value: "11", expect: "reject", reason: "rir between 0 and 10 constraint" },
  { label: "decimal", value: "2.5", expect: "accept", reason: "column is numeric, not integer — half-RIR is meaningful ('somewhere between 2 and 3')" },
  { label: "letters", value: "two", expect: "reject", reason: "not numeric" },
  { label: "huge value", value: "999", expect: "reject", reason: "far outside the 0-10 scale" },
  { label: "empty (optional field)", value: "", expect: "accept", reason: "RIR is nullable/optional in the schema" },
];

// --- Programme name ---------------------------------------------------------
// Source of truth: programs.name text not null check (char_length(name)
// between 1 and 80).
export const PROGRAMME_NAME_CASES: FuzzCase[] = [
  { label: "normal text", value: "Push Pull Legs", expect: "accept", reason: "typical valid name" },
  { label: "accented characters", value: "Força e Hipertrofia", expect: "accept", reason: "legitimate human text must not be rejected for using accents" },
  { label: "empty", value: "", expect: "reject", reason: "char_length >= 1" },
  { label: "whitespace only", value: "   ", expect: "reject", reason: "trims to empty — no meaningful name" },
  { label: "leading/trailing whitespace", value: "  Push Pull Legs  ", expect: "accept", reason: "should be trimmed and treated as the inner value, not rejected" },
  { label: "numbers", value: "5x5 Programme", expect: "accept", reason: "digits are legitimate in a name" },
  { label: "punctuation", value: "PPL — Advanced!", expect: "accept", reason: "legitimate punctuation" },
  { label: "emoji", value: "Leg Day 🔥💪", expect: "accept", reason: "not explicitly excluded; a name is free text" },
  { label: "exactly at max length (80)", value: "A".repeat(80), expect: "accept", reason: "char_length <= 80, inclusive" },
  { label: "one over max length (81)", value: "A".repeat(81), expect: "reject", reason: "char_length <= 80 constraint" },
  { label: "very long (500 chars)", value: "A".repeat(500), expect: "reject", reason: "far exceeds the 80-char constraint" },
  { label: "repeated characters", value: "A".repeat(79), expect: "accept", reason: "within the length limit regardless of content repetition" },
];

// --- Exercise name ----------------------------------------------------------
// Source of truth: exercises.name text not null check (char_length(name)
// between 1 and 120).
export const EXERCISE_NAME_CASES: FuzzCase[] = [
  { label: "normal text", value: "Incline Bench Press", expect: "accept", reason: "typical valid name" },
  { label: "accented characters", value: "Élévation Latérale", expect: "accept", reason: "legitimate human text" },
  { label: "empty", value: "", expect: "reject", reason: "char_length >= 1" },
  { label: "whitespace only", value: "     ", expect: "reject", reason: "trims to empty" },
  { label: "punctuation", value: "Zottman Curl (DB)", expect: "accept", reason: "legitimate punctuation" },
  { label: "emoji", value: "Deadlift 💀", expect: "accept", reason: "not explicitly excluded" },
  { label: "exactly at max length (120)", value: "B".repeat(120), expect: "accept", reason: "char_length <= 120, inclusive" },
  { label: "one over max length (121)", value: "B".repeat(121), expect: "reject", reason: "char_length <= 120 constraint" },
  { label: "very long (1000 chars)", value: "B".repeat(1000), expect: "reject", reason: "far exceeds the 120-char constraint" },
];

// --- Security / robustness payloads -----------------------------------------
// Applied to every free-text field (programme name, exercise name,
// description, notes). None of these should execute, corrupt state, or
// reach Postgres unescaped — they should simply be stored/rejected as inert
// text, exactly like any other string, or rejected by length/emptiness
// rules if they happen to violate those.
export const SECURITY_PAYLOADS: { label: string; value: string }[] = [
  { label: "SQL injection (tautology)", value: "' OR '1'='1" },
  { label: "SQL injection (drop table)", value: "\"; DROP TABLE users; --" },
  { label: "script tag", value: "<script>alert('xss')</script>" },
  { label: "img onerror", value: "<img src=x onerror=alert(1)>" },
  { label: "template injection", value: "{{7*7}}" },
  { label: "path traversal", value: "../../etc/passwd" },
  { label: "null byte", value: "test value" },
  { label: "backslashes and quotes", value: `back\\slash "double" 'single'` },
  { label: "angle brackets and braces", value: "<tag>{brace}[bracket]" },
  { label: "newlines and tabs", value: "line1\nline2\tindented" },
  { label: "unicode RTL override", value: "test‮gnihtemos" },
  { label: "very long payload", value: "<script>".repeat(200) },
];

/** Weight/reps/RIR values that specifically probe NaN propagation through Number(...). */
export const NAN_PROPAGATION_CASES = ["abc", "NaN", "Infinity", "1e999", "0x10", "  "];
