/**
 * Every API route, in the order the docs list them within each group. A new route:
 * declare it with `defineRoute` in its group's file and add it here; the dispatcher
 * and the docs pick it up (see "Adding an API route" in CLAUDE.md).
 */
import type { Route } from "../registry";
import { getMe, getMyUsage, getStatus } from "./system";

export const ROUTES: readonly Route[] = [getStatus, getMe, getMyUsage];
