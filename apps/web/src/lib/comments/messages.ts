import { COMMENT_MAX_LENGTH, LIMITS, type CreateError } from "./store";

const count = new Intl.NumberFormat("en");

/** Why a comment wasn't posted, for the person who wrote it. */
export function commentErrorMessage(
  error: CreateError,
  bodyLength = 0,
): string {
  switch (error) {
    case "empty":
      return "Your comment is empty.";
    case "too-long":
      return `Comments can be up to ${count.format(COMMENT_MAX_LENGTH)} characters; yours has ${count.format(bodyLength)}.`;
    case "blocked":
      return "Your account can’t comment here.";
    case "no-parent":
      return "The comment you replied to isn’t there any more.";
    case "rate-limited":
      return "You’ve posted a lot in a short time. Please wait a few minutes and try again.";
    case "too-many-pending":
      return `You have ${String(LIMITS.pending)} comments waiting for review. Once one is approved, you can post more.`;
  }
}

/** HTTP status for a refused comment. */
export function commentErrorStatus(error: CreateError): number {
  if (error === "rate-limited" || error === "too-many-pending") return 429;
  if (error === "blocked") return 403;
  return 422;
}
