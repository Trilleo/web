/**
 * The line a forum page shows after a button: ?done=, ?error=, ?reported=1 or
 * ?report-error= (set by /forum/action and /forum/report), shown as a toast.
 */
import { toast } from "../toast";

const DONE: Record<string, string> = {
  banned: "Banned. They can still read the forum.",
};

/** Queues the toast this page's address asks for, if any. */
export function forumNotices(astro: { url: URL; locals: App.Locals }): void {
  const params = astro.url.searchParams;
  const error = params.get("error") ?? params.get("report-error");
  if (error) {
    toast(astro, error.slice(0, 200), "error");
    return;
  }
  if (params.has("reported")) {
    toast(astro, "Thanks: a moderator will look at your report.");
    return;
  }
  const done = params.get("done");
  if (done) toast(astro, DONE[done]);
}
