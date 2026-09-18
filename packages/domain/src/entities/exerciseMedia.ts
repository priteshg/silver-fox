/**
 * How an exercise's demonstration is sourced. New kinds (e.g. a future
 * AI-generated clip) are added here — never by branching on a raw URL in a
 * component, since every consumer already switches on `type`.
 */
export type ExerciseMediaType = "image" | "gif" | "video" | "placeholder";

export interface ExerciseMedia {
  type: ExerciseMediaType;
  /** Required for image/gif/video; omitted (or ignored) for "placeholder". */
  url?: string;
  /** What the media shows, for screen readers — e.g. "Barbell squat, bottom position". */
  altText?: string;
}
