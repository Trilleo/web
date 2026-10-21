import { FORUM_LIMITS } from "@trilleo/forum";
import type { PostError } from "./store";

const number = new Intl.NumberFormat("en");

/** Why a topic or reply wasn't posted, for the person who wrote it. */
export function postErrorMessage(error: PostError, bodyLength = 0): string {
  switch (error) {
    case "forbidden":
      return "You can’t post here.";
    case "empty-title":
      return "Give your topic a title.";
    case "short-title":
      return `Titles need at least ${String(FORUM_LIMITS.title.min)} characters.`;
    case "long-title":
      return `Titles can be up to ${String(FORUM_LIMITS.title.max)} characters.`;
    case "empty":
      return "Your post is empty.";
    case "too-long":
      return `Posts can be up to ${number.format(FORUM_LIMITS.body.max)} characters; yours has ${number.format(bodyLength)}.`;
    case "rate-limited":
      return "You’ve posted a lot in a short time. Please wait a few minutes and try again.";
    case "too-many-pending":
      return `You have ${String(FORUM_LIMITS.pending)} posts waiting for approval. Once one is approved, you can post more.`;
  }
}

export function postErrorStatus(error: PostError): number {
  if (error === "rate-limited" || error === "too-many-pending") return 429;
  if (error === "forbidden") return 403;
  return 422;
}

/** Whether the error is about the title (shown by that field) or the text. */
export function isTitleError(error: PostError): boolean {
  return (
    error === "empty-title" || error === "short-title" || error === "long-title"
  );
}
