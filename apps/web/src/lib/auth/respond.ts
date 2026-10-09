/** JSON answers for the passkey routes (src/pages/api/auth/passkeys/). */

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

/** JSON posts aren't covered by the form origin check: these insist on it. */
export function sameOrigin(request: Request, url: URL): boolean {
  return request.headers.get("origin") === url.origin;
}
