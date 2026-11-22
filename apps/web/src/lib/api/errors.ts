/**
 * Every error the API answers with: one JSON shape, a stable `code` clients can
 * switch on, and the HTTP status that goes with it. The docs' Errors page lists
 * ERROR_CODES as they are here; routes name the ones they can return besides the
 * common ones.
 *
 *   { "error": { "code": "invalid_input", "message": "…", "details": {…},
 *                "requestId": "req_…" } }
 */

export interface ErrorCodeInfo {
  status: number;
  /** When it happens and what to do about it (Markdown, for the docs). */
  description: string;
}

export const ERROR_CODES = {
  invalid_json: {
    status: 400,
    description: "The body isn't valid JSON.",
  },
  invalid_input: {
    status: 400,
    description:
      "A path parameter, query parameter or body field is missing or wrong. `details.problems` lists each one as `{ path, message }`.",
  },
  missing_key: {
    status: 401,
    description:
      "The route needs an API key and the request had none. Send `Authorization: Bearer <key>`.",
  },
  invalid_key: {
    status: 401,
    description:
      "The key or personal token isn't one the site knows (mistyped, or deleted with its app or account).",
  },
  key_revoked: {
    status: 401,
    description:
      "The key was revoked in the control panel, or the personal token by its account. Ask for (or link) a new one.",
  },
  key_expired: {
    status: 401,
    description:
      "The key or personal token passed its expiry date. Ask for (or link) a new one.",
  },
  token_required: {
    status: 401,
    description:
      "The route acts for an account and needs that account's personal token (`trlu_…`): send `Authorization: Bearer <token>`. An app's key won't do. Get one by linking the device (see Personal tokens).",
  },
  account_blocked: {
    status: 403,
    description:
      "The personal token's account is blocked, so its tokens don't work.",
  },
  authorization_pending: {
    status: 400,
    description:
      "Device link: the person hasn't approved the code yet. Wait `details.interval` seconds and poll again.",
  },
  slow_down: {
    status: 400,
    description:
      "Device link: polled sooner than `details.interval` seconds after the last poll. Wait longer between polls.",
  },
  access_denied: {
    status: 403,
    description:
      "Device link: the person declined it (or their account has no room for another token). Stop polling.",
  },
  expired_token: {
    status: 400,
    description:
      "Device link: the device code expired before it was approved, or was already used. Start a new link.",
  },
  app_disabled: {
    status: 403,
    description:
      "The key's app is switched off in the control panel; none of its keys work until it's switched back on.",
  },
  insufficient_scope: {
    status: 403,
    description:
      "The key doesn't have the scope this route needs. `details.required` names it.",
  },
  not_found: {
    status: 404,
    description:
      "No such route, or the thing asked for doesn't exist (or isn't visible to you).",
  },
  no_puzzle: {
    status: 404,
    description:
      "There's no daily cryptic for that day (none was set, or the day hasn't come yet). Don't fall back to another day's.",
  },
  guess_wrong_length: {
    status: 400,
    description:
      "The guess hasn't got the answer's number of letters, so it wasn't counted as a try. `details.letters` is how many the answer has, `details.got` how many the guess had (only letters count).",
  },
  profile_limit: {
    status: 409,
    description:
      "SkyBlock sync: the account already has as many SkyBlock profiles as it may (`details.limit`), so a new one can't be made. The person can delete one on the site's profiles page.",
  },
  prices_unavailable: {
    status: 503,
    description:
      "The site hasn't got Hypixel's Bazaar prices yet (it fetches them every few minutes, and Hypixel may not be answering). Try again in a few minutes.",
  },
  feed_unavailable: {
    status: 503,
    description:
      "The site hasn't read that from Hypixel yet (it reads the election every 5 minutes and Bingo every 30, and Hypixel may not be answering). Try again in a few minutes.",
  },
  method_not_allowed: {
    status: 405,
    description:
      "The route exists but not with this method. The `Allow` header lists the ones it takes.",
  },
  body_too_large: {
    status: 413,
    description: "The body is larger than the API accepts.",
  },
  unsupported_media_type: {
    status: 415,
    description:
      "Bodies must be JSON, sent with `Content-Type: application/json`.",
  },
  rate_limited: {
    status: 429,
    description:
      "Too many requests. Wait for the number of seconds in `Retry-After` (also `details.retryAfter`) and try again.",
  },
  internal_error: {
    status: 500,
    description:
      "Something broke on the site's side. Retrying later is safe for reads; quote the `requestId` if it keeps happening.",
  },
} as const satisfies Record<string, ErrorCodeInfo>;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Codes any route can answer with, so routes needn't list them. */
export const COMMON_ERRORS: readonly ErrorCode[] = [
  "invalid_input",
  "rate_limited",
  "internal_error",
];

/** Codes every route that needs a key can answer with. */
export const KEY_ERRORS: readonly ErrorCode[] = [
  "missing_key",
  "invalid_key",
  "key_revoked",
  "key_expired",
  "app_disabled",
];

/** Codes every route that acts for an account can answer with. */
export const TOKEN_ERRORS: readonly ErrorCode[] = [
  "token_required",
  "invalid_key",
  "key_revoked",
  "key_expired",
  "account_blocked",
];

/** Thrown by handlers (and the dispatcher) to answer with an error. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_CODES[code].status;
    this.details = details;
  }
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

export function errorBody(error: ApiError, requestId: string): ErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId,
    },
  };
}
