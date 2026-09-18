import type { ISODateString, ProgressPhotoId, Timestamped, UserId } from "@silver-fox/types";

/** A physique progress photo. `uri` is a local device reference — nothing is uploaded anywhere. */
export interface ProgressPhoto extends Timestamped {
  id: ProgressPhotoId;
  userId: UserId;
  date: ISODateString;
  uri: string;
  note?: string;
}
