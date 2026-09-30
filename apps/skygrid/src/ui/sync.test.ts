import { describe, expect, it, vi } from "vitest";
import { newGame, type Action } from "../core";
import { GameSession } from "./session";
import { SYNC_URL, Syncer } from "./sync";

const T0 = 1_800_000_000_000;

function setup(
  reply: (body: {
    version: number;
    actions: Action[];
  }) => Response | Promise<Response>,
) {
  const clock = { now: T0 + 1000 };
  const sent: { version: number; actions: Action[] }[] = [];
  const fetchImpl = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    expect(url).toBe(SYNC_URL);
    const body = JSON.parse(init?.body as string) as {
      version: number;
      actions: Action[];
    };
    sent.push(body);
    return Promise.resolve(reply(body));
  });
  const holder: { syncer?: Syncer } = {};
  const session = new GameSession(newGame(1, T0), {
    now: () => clock.now,
    storage: null,
    onAction: (action) => holder.syncer?.record(action),
  });
  const syncer = new Syncer(session, 1, fetchImpl);
  holder.syncer = syncer;
  const step = () => {
    clock.now += 150;
    session.act({ k: "move", d: "R" });
  };
  return { session, syncer, sent, step, fetchImpl };
}

describe("Syncer", () => {
  it("sends what you did, with the version it builds on", async () => {
    const { syncer, sent, step } = setup(({ version }) =>
      Response.json({ version: version + 1, serverTime: T0 }),
    );
    step();
    step();
    expect(syncer.getStatus()).toBe("saving");
    await syncer.flush();
    step();
    await syncer.flush();
    expect(sent.map((body) => [body.version, body.actions.length])).toEqual([
      [1, 2],
      [2, 1],
    ]);
    expect(syncer.getStatus()).toBe("saved");
  });

  it("keeps actions while offline, and sends them later", async () => {
    let online = false;
    const { syncer, sent, step } = setup(({ version }) => {
      if (!online) throw new TypeError("offline");
      return Response.json({ version: version + 1 });
    });
    step();
    await syncer.flush();
    expect(syncer.getStatus()).toBe("offline");
    online = true;
    step();
    await syncer.flush();
    expect(sent.at(-1)?.actions).toHaveLength(2);
    expect(syncer.getStatus()).toBe("saved");
  });

  it("takes the server's island when it refuses something", async () => {
    const server = { ...newGame(9, T0), coins: 123 };
    const { session, syncer, step } = setup(() =>
      Response.json(
        { error: "Slow down.", state: server, version: 5 },
        { status: 422 },
      ),
    );
    step();
    await syncer.flush();
    expect(session.getView().state.coins).toBe(123);
    expect(session.getView().log.at(-1)?.text).toBe(
      "Slow down. Your island was reloaded from your account.",
    );
    expect(syncer.getStatus()).toBe("saved");
  });

  it("stops when signed out", async () => {
    const { syncer, step, fetchImpl } = setup(() =>
      Response.json({ error: "Sign in." }, { status: 401 }),
    );
    step();
    await syncer.flush();
    expect(syncer.getStatus()).toBe("signed-out");
    step();
    await syncer.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
