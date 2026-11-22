import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import {
  feedIcs,
  readFeedChoice,
} from "../../../../lib/skyblock/calendar-feed";
import { liveFeeds } from "../../../../lib/skyblock/feeds";

export const prerender = false;

/**
 * GET /tools/skyblock/events/calendar.ics[?events=a,b&alarm=15]: the event timer as a
 * calendar to subscribe to (lib/skyblock/calendar-feed.ts). The same for everyone
 * with the same link, so it may be cached briefly.
 */
export const GET: APIRoute = async ({ url }) => {
  const now = Date.now();
  const { election } = await liveFeeds(await getDb(), now);
  return new Response(
    feedIcs(readFeedChoice(url.searchParams), election, now),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="skyblock-events.ics"',
        "Cache-Control": "public, max-age=300",
        "X-Robots-Tag": "noindex",
      },
    },
  );
};
