/**
 * Every API route, in the order the docs list them within each group. A new route:
 * declare it with `defineRoute` in its group's file and add it here; the dispatcher
 * and the docs pick it up (see "Adding an API route" in CLAUDE.md).
 */
import type { Route } from "../registry";
import {
  deleteCrypticPlayer,
  getCrypticDay,
  getCrypticDayLeaderboard,
  getCrypticLeaderboard,
  getCrypticPlayer,
  getCrypticToday,
  listCrypticArchive,
  postCrypticGuess,
} from "./cryptic";
import {
  getMinecraftLatest,
  getMinecraftProject,
  listMinecraftProjects,
} from "./minecraft";
import { getPost, listPosts, listTags } from "./posts";
import { getSite, listGames, listTools } from "./site";
import { getStudySubject, listStudySubjects } from "./study";
import { getMe, getMyUsage, getStatus } from "./system";

export const ROUTES: readonly Route[] = [
  getStatus,
  getMe,
  getMyUsage,
  getSite,
  listTools,
  listGames,
  listPosts,
  getPost,
  listTags,
  listMinecraftProjects,
  getMinecraftProject,
  getMinecraftLatest,
  listStudySubjects,
  getStudySubject,
  getCrypticToday,
  getCrypticDay,
  listCrypticArchive,
  postCrypticGuess,
  getCrypticDayLeaderboard,
  getCrypticLeaderboard,
  getCrypticPlayer,
  deleteCrypticPlayer,
];
