import { describe, expect, it } from "vitest";
import { NOTIFY_KEY, dueNotices, readChoices } from "./event-notify";

function storage(value: string | null): Storage {
  return {
    getItem: (key: string) => (key === NOTIFY_KEY ? value : null),
  } as unknown as Storage;
}

describe("browser notifications", () => {
  it("reads the choices kept in this browser, ignoring anything odd", () => {
    expect(readChoices(storage('{"dark-auction":5,"x":"no","y":-1}'))).toEqual({
      "dark-auction": 5,
    });
    expect(readChoices(storage("not json"))).toEqual({});
    expect(readChoices(null)).toEqual({});
  });

  it("shows a chosen event once, from its lead until a little after it starts", () => {
    const start = Date.UTC(2026, 10, 22, 12, 55);
    const times = [
      { slug: "dark-auction", name: "Dark Auction", start },
      { slug: "spooky-festival", name: "Spooky Festival", start },
    ];
    const choices = { "dark-auction": 5 };
    expect(dueNotices(times, choices, new Set(), start - 6 * 60_000)).toEqual(
      [],
    );
    const [notice] = dueNotices(times, choices, new Set(), start - 5 * 60_000);
    expect(notice?.title).toBe("Dark Auction starts in 5 minutes");
    expect(
      dueNotices(times, choices, new Set([notice?.key ?? ""]), start - 60_000),
    ).toEqual([]);
    expect(dueNotices(times, choices, new Set(), start + 10 * 60_000)).toEqual(
      [],
    );
  });
});
