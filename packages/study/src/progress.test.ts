import { describe, expect, test } from "vitest";
import { checkData, parseQuiz } from "./quiz";
import {
  DEFAULT_SETTINGS,
  buildProgress,
  formatInterval,
  itemKey,
  parseEvent,
  parseSettings,
  practiceSet,
  previewIntervals,
  type Deck,
  type DeckQuestion,
  type StudyEvent,
} from "./progress";

const NOW = new Date("2026-11-10T04:00:00Z"); // noon in Beijing
let serial = 0;

function event(
  kind: StudyEvent["kind"],
  item: string,
  at: Date,
  data: object = {},
): StudyEvent {
  serial += 1;
  const id = `00000000-0000-4000-8000-${String(serial).padStart(12, "0")}`;
  const parsed = parseEvent(
    { id, kind, subject: "circuits", item, at: at.toISOString(), data },
    NOW,
  );
  if (!parsed) throw new Error(`bad event ${kind}`);
  return parsed;
}

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

function question(id: string, lesson: string, answer: string): DeckQuestion {
  const { questions } = parseQuiz(`? Q\nanswer: ${answer}`);
  const [source] = questions;
  if (!source) throw new Error("no question");
  return {
    id,
    lesson,
    kind: source.kind,
    prompt: "<p>Q</p>",
    options: [],
    optionLabels: [],
    answer,
    explanation: "<p>Why.</p>",
    check: checkData(source),
  };
}

const DECK: Deck = {
  subject: "circuits",
  title: "Circuits",
  zh: null,
  exams: [],
  lessons: [
    { slug: "ohm", number: "1.1", title: "Ohm" },
    { slug: "kcl", number: "1.2", title: "KCL" },
  ],
  cards: [
    { id: "c:ohm:a", lesson: "ohm", front: "A", back: "a" },
    { id: "c:ohm:b", lesson: "ohm", front: "B", back: "b" },
    { id: "c:kcl:c", lesson: "kcl", front: "C", back: "c" },
  ],
  questions: [
    question("q:ohm:1", "ohm", "1 V"),
    question("q:kcl:2", "kcl", "2 A"),
  ],
};

describe("parseEvent", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000001",
    subject: "circuits",
    item: "c:ohm:a",
    at: NOW.toISOString(),
  };

  test("accepts each kind, trimming long answers", () => {
    expect(
      parseEvent({ ...base, kind: "review", data: { grade: 3 } }, NOW)?.kind,
    ).toBe("review");
    const attempt = parseEvent(
      {
        ...base,
        kind: "attempt",
        data: { correct: false, response: "x".repeat(400) },
      },
      NOW,
    );
    expect(attempt?.kind === "attempt" && attempt.data.response.length).toBe(
      300,
    );
    expect(
      parseEvent(
        { ...base, kind: "studied", item: "ohm", data: { extra: 1 } },
        NOW,
      )?.data,
    ).toEqual({});
  });

  test("refuses anything malformed", () => {
    expect(
      parseEvent({ ...base, kind: "review", data: { grade: 5 } }, NOW),
    ).toBeNull();
    expect(
      parseEvent({ ...base, id: "nope", kind: "studied", data: {} }, NOW),
    ).toBeNull();
    expect(
      parseEvent(
        { ...base, subject: "Bad Subject", kind: "studied", data: {} },
        NOW,
      ),
    ).toBeNull();
    expect(
      parseEvent({ ...base, item: "<script>", kind: "studied", data: {} }, NOW),
    ).toBeNull();
    expect(parseEvent({ ...base, kind: "wat", data: {} }, NOW)).toBeNull();
    // From the future (beyond clock drift), or before the site existed.
    expect(
      parseEvent(
        { ...base, kind: "studied", data: {}, at: "2027-01-01T00:00:00Z" },
        NOW,
      ),
    ).toBeNull();
    expect(
      parseEvent(
        { ...base, kind: "studied", data: {}, at: "2019-01-01T00:00:00Z" },
        NOW,
      ),
    ).toBeNull();
  });

  test("checks settings", () => {
    expect(parseSettings({ newPerDay: 10, retention: 0.85 })).toEqual({
      newPerDay: 10,
      retention: 0.85,
    });
    expect(parseSettings({ newPerDay: -1, retention: 0.9 })).toBeNull();
    expect(parseSettings({ newPerDay: 10, retention: 1 })).toBeNull();
  });
});

describe("buildProgress", () => {
  test("a lesson's cards start once it's studied, within the daily allowance", () => {
    expect(buildProgress([], [DECK], DEFAULT_SETTINGS, NOW).fresh).toEqual([]);
    const studied = [event("studied", "ohm", hoursAgo(2))];
    const progress = buildProgress(studied, [DECK], DEFAULT_SETTINGS, NOW);
    expect(progress.fresh.map((card) => card.id)).toEqual([
      "c:ohm:a",
      "c:ohm:b",
    ]);
    const capped = buildProgress(
      studied,
      [DECK],
      { ...DEFAULT_SETTINGS, newPerDay: 1 },
      NOW,
    );
    expect(capped.fresh).toHaveLength(1);
    expect(capped.waiting).toBe(1);
  });

  test("reviews schedule cards with FSRS and count against today's new cards", () => {
    const events = [
      event("studied", "ohm", hoursAgo(3)),
      event("review", "c:ohm:a", hoursAgo(2), { grade: 4 }),
      event("review", "c:ohm:b", hoursAgo(2), { grade: 1 }),
    ];
    const progress = buildProgress(
      events,
      [DECK],
      { ...DEFAULT_SETTINGS, newPerDay: 2 },
      NOW,
    );
    expect(progress.startedToday).toBe(2);
    expect(progress.fresh).toEqual([]);
    // "Again" comes back within minutes (due now); "Easy" skips learning (days away).
    expect(progress.due.map((entry) => entry.card.id)).toEqual(["c:ohm:b"]);
    expect(progress.cards.get(itemKey("circuits", "c:ohm:a"))?.reviews).toBe(1);
    // Days later, both are due, and recall has dropped.
    const later = buildProgress(
      events,
      [DECK],
      DEFAULT_SETTINGS,
      new Date(NOW.getTime() + 30 * 86_400_000),
    );
    expect(later.due).toHaveLength(2);
    expect(
      later.cards.get(itemKey("circuits", "c:ohm:a"))?.recall,
    ).toBeLessThan(0.9);
  });

  test("the same events give the same schedules, in any order", () => {
    const events = [
      event("studied", "ohm", hoursAgo(80)),
      event("review", "c:ohm:a", hoursAgo(72), { grade: 3 }),
      event("review", "c:ohm:a", hoursAgo(24), { grade: 4 }),
    ];
    const one = buildProgress(events, [DECK], DEFAULT_SETTINGS, NOW);
    const two = buildProgress(
      [...events].reverse(),
      [DECK],
      DEFAULT_SETTINGS,
      NOW,
    );
    const key = itemKey("circuits", "c:ohm:a");
    expect(two.cards.get(key)?.fsrs.due.getTime()).toBe(
      one.cards.get(key)?.fsrs.due.getTime(),
    );
  });

  test("mistakes are questions whose latest answer was wrong, and can become cards", () => {
    const events = [
      event("attempt", "q:ohm:1", hoursAgo(5), {
        correct: false,
        response: "2 V",
      }),
      event("attempt", "q:kcl:2", hoursAgo(5), {
        correct: false,
        response: "1 A",
      }),
      event("attempt", "q:kcl:2", hoursAgo(4), {
        correct: true,
        response: "2 A",
      }),
      event("card", "q:ohm:1", hoursAgo(3)),
    ];
    const progress = buildProgress(events, [DECK], DEFAULT_SETTINGS, NOW);
    expect(
      progress.mistakes.map((mistake) => [
        mistake.question.id,
        mistake.progress.lastResponse,
        mistake.carded,
      ]),
    ).toEqual([["q:ohm:1", "2 V", true]]);
    const kcl = progress.questions.get(itemKey("circuits", "q:kcl:2"));
    expect(kcl).toMatchObject({ attempts: 2, first: false, latest: true });
    // The card made from the question is new today.
    expect(progress.fresh.map((card) => [card.id, card.source])).toEqual([
      ["q:ohm:1", "question"],
    ]);
    expect(progress.fresh[0]?.back).toContain("1 V");
  });

  test("mastery mixes quiz results and recall; the subject counts untouched lessons", () => {
    const events = [
      event("studied", "ohm", hoursAgo(5)),
      event("attempt", "q:ohm:1", hoursAgo(4), {
        correct: true,
        response: "1 V",
      }),
    ];
    const progress = buildProgress(events, [DECK], DEFAULT_SETTINGS, NOW);
    expect(progress.lessons.get(itemKey("circuits", "ohm"))).toMatchObject({
      mastery: 1,
      right: 1,
      answered: 1,
      questions: 1,
      cards: 2,
      started: 0,
    });
    expect(
      progress.lessons.get(itemKey("circuits", "kcl"))?.mastery,
    ).toBeNull();
    expect(progress.subjects.get("circuits")).toEqual({
      mastery: 0.5,
      studied: 1,
      lessons: 2,
    });
  });

  test("counts the streak in China's days, and suggests the next lesson", () => {
    const days = [0, 1, 2, 4].map((back) =>
      event("attempt", "q:ohm:1", new Date(NOW.getTime() - back * 86_400_000), {
        correct: true,
        response: "1 V",
      }),
    );
    const progress = buildProgress(
      [event("studied", "ohm", hoursAgo(1)), ...days],
      [DECK],
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(progress.streak).toBe(3);
    expect(progress.activity).toHaveLength(30);
    expect(progress.activity.at(-1)).toEqual({ day: "2026-11-10", count: 1 });
    expect(progress.next).toEqual({ subject: "circuits", lesson: "kcl" });
  });

  test("forgets cards whose lesson no longer has them", () => {
    const progress = buildProgress(
      [event("review", "c:ohm:gone", hoursAgo(1), { grade: 3 })],
      [DECK],
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(progress.cards.size).toBe(0);
    expect(progress.activity.at(-1)?.count).toBe(1);
  });
});

describe("helpers", () => {
  test("previews each grade's next due date, later for easier grades", () => {
    const preview = previewIntervals(null, DEFAULT_SETTINGS, NOW);
    expect(preview[1].getTime()).toBeLessThan(preview[4].getTime());
    expect(formatInterval(NOW, preview[1])).toMatch(/min$/);
  });

  test("formats intervals", () => {
    const after = (ms: number) =>
      formatInterval(NOW, new Date(NOW.getTime() + ms));
    expect(after(30_000)).toBe("1 min");
    expect(after(3 * 3_600_000)).toBe("3 h");
    expect(after(4 * 86_400_000)).toBe("4 d");
    expect(after(90 * 86_400_000)).toBe("3 mo");
  });

  test("practice sets lean towards mistakes and stay within the deck", () => {
    const progress = buildProgress(
      [
        event("attempt", "q:ohm:1", hoursAgo(1), {
          correct: false,
          response: "0",
        }),
      ],
      [DECK],
      DEFAULT_SETTINGS,
      NOW,
    );
    // A low draw picks the heaviest (the mistake, weight 4, listed first).
    expect(practiceSet(DECK, progress, 1, () => 0)[0]?.id).toBe("q:ohm:1");
    expect(practiceSet(DECK, progress, 10)).toHaveLength(2);
    expect(
      practiceSet(DECK, progress, 10, Math.random, "kcl").map(
        (entry) => entry.id,
      ),
    ).toEqual(["q:kcl:2"]);
  });
});
