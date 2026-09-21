import type { ProgramId, Timestamped, UserId, WeightUnit } from "@silver-fox/types";
import type { Equipment } from "./exercise";
import type { ProgrammeDifficulty, ProgrammeGoal } from "./program";

export interface User extends Timestamped {
  id: UserId;
  /** Undefined for an anonymous session — set once someone adds a name/email. */
  displayName?: string;
  email?: string;
  age?: number;
  preferredWeightUnit: WeightUnit;
  /** Reuses `ProgrammeDifficulty`: how experienced the user is maps directly to which programmes suit them. */
  trainingExperience?: ProgrammeDifficulty;
  goals?: ProgrammeGoal[];
  preferredTrainingDaysPerWeek?: number;
  availableEquipment?: Equipment[];
  /** Which programme this user is actively following. Undefined until they pick one. */
  activeProgramId?: ProgramId;
}
