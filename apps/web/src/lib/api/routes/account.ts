/**
 * The Account group: linking a device to get a personal token (device.ts), and who a
 * token acts for. Routes that act for an account (`auth: "user"`, or a user scope)
 * live in their feature's group; this one holds what every such program needs first.
 */
import { pollDeviceLink, formatUserCode, startDeviceLink } from "../device";
import { ApiError } from "../errors";
import { DEVICE_LIMITS, USER_TOKEN_LIMITS } from "../limits";
import { defineRoute } from "../registry";
import { t } from "../schema";
import { USER_SCOPES, type UserScope } from "../scopes";
import { revokeUserToken } from "../user-tokens";
import { logEvent } from "../../auth/activity";

const userScopeNames = Object.keys(USER_SCOPES) as UserScope[];
const userScopeList = (description: string) =>
  t.array(t.enum(userScopeNames), { description, max: userScopeNames.length });

export const startDevice = defineRoute({
  method: "POST",
  path: "/v1/auth/device",
  operationId: "startDeviceLink",
  group: "account",
  summary: "Start linking a device",
  description: `The first step of linking a program (a game mod, a script) to someone's account without them copying a secret. Show the person \`userCode\` and \`verificationUri\` (or open \`verificationUriComplete\`); they sign in on the site and approve it. Meanwhile poll [Finish linking a device](#finishDeviceLink) every \`interval\` seconds with \`deviceCode\`, which you keep to yourself. The link expires after ${String(DEVICE_LIMITS.codeMinutes)} minutes. Needs no key; ${String(DEVICE_LIMITS.startsPerMinute)} links a minute per visitor.`,
  auth: "public",
  cacheSeconds: 0,
  status: 201,
  body: t.object({
    clientName: t.string({
      min: 1,
      max: USER_TOKEN_LIMITS.nameLength,
      description:
        "What the person sees asking for access, and the token's name: your program's name, and where it runs if that helps (\"SkyBlock mod on my laptop\").",
    }),
    scopes: userScopeList(
      "The personal-token scopes to ask for (see Personal tokens).",
    ),
  }),
  response: t.object({
    deviceCode: t.string({
      description:
        "Your secret for polling. Don't show it or log it; it works once.",
    }),
    userCode: t.string({
      description:
        'What the person types on the site: eight letters, shown as "BCDF-GHJK". Case and the hyphen don\'t matter.',
    }),
    verificationUri: t.string({
      description: "Where the person approves it.",
      format: "uri",
    }),
    verificationUriComplete: t.string({
      description:
        "The same page with the code filled in, to open in a browser or show as a QR code.",
      format: "uri",
    }),
    expiresIn: t.integer({
      description: "Seconds until the link expires.",
    }),
    interval: t.integer({
      description: "Seconds to wait between polls.",
    }),
  }),
  errors: [],
  example: {
    body: { clientName: "SkyBlock mod", scopes: ["skyblock:sync"] },
    response: {
      deviceCode: "trld_Q2k9xT7bLm4ZpR8sV1nW6yH3cJ5fD0aE",
      userCode: "BCDF-GHJK",
      verificationUri: "https://www.trilleo.net/link/",
      verificationUriComplete: "https://www.trilleo.net/link/?code=BCDF-GHJK",
      expiresIn: DEVICE_LIMITS.codeMinutes * 60,
      interval: DEVICE_LIMITS.intervalSeconds,
    },
  },
  handler: async ({ db, body, limiter, visitor, now, siteOrigin }) => {
    const turn = limiter.take(
      `device-start:${visitor}`,
      DEVICE_LIMITS.startsPerMinute,
      now.getTime(),
    );
    if (!turn.ok)
      throw new ApiError(
        "rate_limited",
        `Too many device links: try again in ${String(turn.reset)} s.`,
        { retryAfter: turn.reset },
      );
    const started = await startDeviceLink(db, body, now);
    const code = formatUserCode(started.userCode);
    const link = `${siteOrigin}/link/`;
    return {
      deviceCode: started.deviceCode,
      userCode: code,
      verificationUri: link,
      verificationUriComplete: `${link}?code=${code}`,
      expiresIn: Math.round(
        (started.expiresAt.getTime() - now.getTime()) / 1000,
      ),
      interval: DEVICE_LIMITS.intervalSeconds,
    };
  },
});

export const finishDevice = defineRoute({
  method: "POST",
  path: "/v1/auth/device/token",
  operationId: "finishDeviceLink",
  group: "account",
  summary: "Finish linking a device",
  description:
    "Poll this with the `deviceCode` from [Start linking a device](#startDeviceLink), waiting `interval` seconds between polls. Until the person decides it answers `authorization_pending` (keep polling) or `slow_down` (wait longer); then either the personal token, once, or `access_denied` (they declined: stop). An expired or used code answers `expired_token`: start again. Keep the token as you would a password; it works until the person revokes it on their account page.",
  auth: "public",
  cacheSeconds: 0,
  body: t.object({
    deviceCode: t.string({ description: "From the first step." }),
  }),
  response: t.object({
    token: t.string({
      description:
        "The personal token (`trlu_…`). Send it as `Authorization: Bearer <token>`.",
    }),
    tokenType: t.enum(["Bearer"] as const),
    name: t.string({ description: "The token's name on the account page." }),
    scopes: userScopeList("What the token may do."),
  }),
  errors: [
    "authorization_pending",
    "slow_down",
    "access_denied",
    "expired_token",
  ],
  example: {
    body: { deviceCode: "trld_Q2k9xT7bLm4ZpR8sV1nW6yH3cJ5fD0aE" },
    response: {
      token: "trlu_7HcV2pQ9mXa4LkR1sT8bN3wZ6yD0fJ5e",
      tokenType: "Bearer",
      name: "SkyBlock mod",
      scopes: ["skyblock:sync"],
    },
  },
  handler: async ({ db, body, now }) => {
    const made = await pollDeviceLink(db, body.deviceCode, now);
    return {
      token: made.token,
      tokenType: "Bearer" as const,
      name: made.name,
      scopes: made.scopes,
    };
  },
});

export const getAccount = defineRoute({
  method: "GET",
  path: "/v1/account",
  operationId: "getAccount",
  group: "account",
  summary: "Get the token's account",
  description:
    'Who the personal token acts for and what it may do: a good first call after linking, to show "Linked as @name".',
  auth: "user",
  cacheSeconds: 0,
  response: t.object({
    username: t.string({ description: "The account's username." }),
    token: t.object({
      id: t.integer(),
      name: t.string({ description: "Its name on the account page." }),
      prefix: t.string({
        description: "Its first characters, as the account page shows them.",
      }),
      via: t.enum(["manual", "device"] as const, {
        description: "Made by hand on the site, or by linking a device.",
      }),
      createdAt: t.dateTime(),
      expiresAt: t.nullable(t.dateTime("When it stops working, if ever.")),
    }),
    scopes: userScopeList("What the token may do."),
    rateLimit: t.object({
      limit: t.integer({ description: "Requests per minute." }),
      remaining: t.integer({ description: "Requests left right now." }),
      reset: t.integer({ description: "Seconds until the bucket is full." }),
    }),
  }),
  example: {
    response: {
      username: "trilleo",
      token: {
        id: 4,
        name: "SkyBlock mod",
        prefix: "trlu_7HcV2p",
        via: "device",
        createdAt: "2026-11-21T08:00:00.000Z",
        expiresAt: null,
      },
      scopes: ["skyblock:sync"],
      rateLimit: {
        limit: USER_TOKEN_LIMITS.perMinute,
        remaining: USER_TOKEN_LIMITS.perMinute - 1,
        reset: 1,
      },
    },
  },
  handler: ({ user, rate }) => {
    if (!user) throw new Error("getAccount needs a token.");
    return {
      username: user.user.username,
      token: {
        id: user.token.id,
        name: user.token.name,
        prefix: user.token.prefix,
        via:
          user.token.via === "device"
            ? ("device" as const)
            : ("manual" as const),
        createdAt: user.token.createdAt.toISOString(),
        expiresAt: user.token.expiresAt?.toISOString() ?? null,
      },
      scopes: user.scopes,
      rateLimit: {
        limit: rate.limit,
        remaining: rate.remaining,
        reset: rate.reset,
      },
    };
  },
});

export const revokeOwnToken = defineRoute({
  method: "DELETE",
  path: "/v1/account/token",
  operationId: "revokeOwnToken",
  group: "account",
  summary: "Revoke the token itself",
  description:
    'Revokes the personal token the request is made with, at once: a program\'s "Unlink" or "Sign out" button. The token disappears from the account\'s Apps page. Repeating it answers `key_revoked`.',
  auth: "user",
  cacheSeconds: 0,
  response: t.object({
    revoked: t.boolean({ description: "Always true." }),
  }),
  example: { response: { revoked: true } },
  handler: async ({ db, user, now, request }) => {
    if (!user) throw new Error("revokeOwnToken needs a token.");
    const name = await revokeUserToken(db, user.user.id, user.token.id, now);
    if (name !== null)
      await logEvent(db, user.user.id, "token-revoked", {
        detail: name,
        userAgent: request.headers.get("user-agent"),
        now,
      });
    return { revoked: true };
  },
});
