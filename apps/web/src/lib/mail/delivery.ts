/**
 * Delivery in the running server, like storage maintenance: no job runner.
 * Queueing a message (or an admin alert) starts a pass right away; the middleware
 * also starts one at most every DELIVERY_INTERVAL_MS, which sends retries that came
 * due and alerts that waited out their gap. Never throws, never makes a request wait.
 */
import { authConfig } from "../auth/config";
import { getDb } from "../db";
import { purgeCodes } from "./addresses";
import { flushAdminAlerts, onAdminAlert } from "./alerts";
import { mailSetup } from "./config";
import {
  deliverDue,
  deliverMessage,
  onMailQueued,
  purgeMail,
  type MailDeps,
} from "./outbox";

export const DELIVERY_INTERVAL_MS = 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

let lastRun = 0;
let lastPurge = 0;
let running = false;
let again = false;

async function mailDeps(): Promise<MailDeps> {
  const { config, driver } = mailSetup();
  return { db: await getDb(), driver, config };
}

async function pass(): Promise<void> {
  const deps = await mailDeps();
  const now = new Date();
  await flushAdminAlerts(
    deps.db,
    {
      adminTo: deps.config.adminTo,
      adminGithubIds: [...(authConfig()?.adminIds ?? [])],
    },
    now,
  );
  await deliverDue(deps);
  if (now.getTime() - lastPurge > PURGE_INTERVAL_MS) {
    lastPurge = now.getTime();
    await purgeMail(deps.db, now);
    await purgeCodes(deps.db, now);
  }
}

function start(): void {
  if (running) {
    again = true;
    return;
  }
  running = true;
  lastRun = Date.now();
  void pass()
    .catch((error: unknown) => {
      console.warn("Mail delivery failed:", error);
    })
    .finally(() => {
      running = false;
      if (again) {
        again = false;
        start();
      }
    });
}

/** From the middleware: a pass if one is due. */
export function deliverInBackground(now = Date.now()): void {
  if (now - lastRun < DELIVERY_INTERVAL_MS) return;
  start();
}

/** Hooks the outbox to this server: queued mail goes out at once. */
export function startMailDelivery(): void {
  onMailQueued(start);
  onAdminAlert(start);
}

/**
 * Sends one message now and says how it went: for codes, so the page can tell the
 * person whether it left. A failure stays queued for the background retries.
 */
export async function sendNow(id: number) {
  return deliverMessage(await mailDeps(), id);
}
