import type { UserId } from "@silver-fox/types";

/**
 * No authentication yet — everything is scoped to a single local user id so
 * the domain model (which always ties data to a UserId) stays honest about
 * ownership once accounts exist.
 */
export const LOCAL_USER_ID = "local-user" as UserId;
