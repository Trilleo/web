/**
 * Subjects' decks (cards and questions), built with the site as
 * /study/decks/<subject>.json; /study/decks/index.json lists the subjects. Fetched
 * once per page and shared.
 */
import type { Deck } from "../progress";

const cache = new Map<string, Promise<Deck>>();
let index: Promise<string[]> | null = null;

export function fetchDeck(
  subject: string,
  fetcher: typeof fetch = fetch,
): Promise<Deck> {
  let deck = cache.get(subject);
  if (!deck) {
    deck = fetcher(`/study/decks/${encodeURIComponent(subject)}.json`).then(
      async (response) => {
        if (!response.ok) throw new Error(`No deck for ${subject}.`);
        return (await response.json()) as Deck;
      },
    );
    cache.set(subject, deck);
  }
  return deck;
}

/** Every subject's deck, or just `only`'s. */
export async function fetchDecks(
  only?: string | null,
  fetcher: typeof fetch = fetch,
): Promise<Deck[]> {
  index ??= fetcher("/study/decks/index.json").then(async (response) => {
    if (!response.ok) throw new Error("The subjects couldn’t be loaded.");
    return ((await response.json()) as { subjects: string[] }).subjects;
  });
  const subjects = await index;
  const wanted = only
    ? subjects.filter((subject) => subject === only)
    : subjects;
  return Promise.all(wanted.map((subject) => fetchDeck(subject, fetcher)));
}

/** For tests: forget what was fetched. */
export function clearDeckCache(): void {
  cache.clear();
  index = null;
}
