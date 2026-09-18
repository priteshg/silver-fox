import type { Timestamped, UserId, WeightUnit } from "@silver-fox/types";

export interface User extends Timestamped {
  id: UserId;
  displayName: string;
  email: string;
  preferredWeightUnit: WeightUnit;
}
