/**
 * The Bazaar's API:
 *   GET  /api/games/skygrid/bazaar          → { products: { <item>: { buy, sell, volume } } }
 *   GET  /api/games/skygrid/bazaar/<item>   → { item, bids, asks, history }
 *   GET  /api/games/skygrid/bazaar/orders   → { orders } (yours; signed in)
 *   POST /api/games/skygrid/bazaar/trade    { version, op: BazaarOp }
 *     → 200 { state, version, orders, message, serverTime }; 409 (another tab
 *       played) and 422 (refused) come with { error, state, version }.
 * Prices are public; trading needs an island in the account, standing at the stall.
 */
import type { Database, User } from "@trilleo/db";
import { isBazaarItem, parseBazaarOp } from "@trilleo/game-skygrid/core";
import { json, problem, readChange, withSave } from "./api";
import {
  bazaarProduct,
  bazaarSummary,
  listOrders,
  tradeOnBazaar,
} from "./bazaar";

interface BazaarRequest {
  request: Request;
  url: URL;
  user: User | null;
  getDb: () => Promise<Database>;
  now?: () => number;
}

export async function handleBazaarRead(
  input: BazaarRequest & { item: string | undefined },
): Promise<Response> {
  if (input.request.method !== "GET") {
    return json({ error: "Not allowed." }, 405, { Allow: "GET" });
  }
  const now = new Date((input.now ?? Date.now)());
  const db = await input.getDb();
  if (input.item === undefined) {
    return json({ products: await bazaarSummary(db, now) });
  }
  if (input.item === "orders") {
    if (!input.user) return problem(401, "Sign in to see your orders.");
    return json({ orders: await listOrders(db, input.user.id) });
  }
  if (!isBazaarItem(input.item)) return problem(404, "That isn’t traded here.");
  return json(await bazaarProduct(db, input.item, now));
}

export async function handleBazaarTrade(
  input: BazaarRequest,
): Promise<Response> {
  const change = await readChange(input);
  if (change instanceof Response) return change;
  const { body, user } = change;
  const version = "version" in body ? body.version : undefined;
  const op = parseBazaarOp("op" in body ? body.op : undefined);
  if (typeof version !== "number" || !Number.isSafeInteger(version) || !op) {
    return problem(400, 'Send { "version": …, "op": { … } }.');
  }
  const now = (input.now ?? Date.now)();
  const result = await tradeOnBazaar(
    await input.getDb(),
    user.id,
    { version, op },
    new Date(now),
  );
  if (result.ok) {
    return json({
      ...withSave(result.save, now),
      orders: result.orders,
      message: result.message,
    });
  }
  switch (result.error) {
    case "no-save":
      return problem(404, "There’s no island in your account yet.");
    case "conflict":
      return problem(
        409,
        "Your island changed in another tab.",
        withSave(result.save, now),
      );
    case "rejected":
      return problem(422, result.message, withSave(result.save, now));
  }
}
