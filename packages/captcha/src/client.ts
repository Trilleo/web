/**
 * The human check in the browser (plain DOM, no React, so any page script or island
 * can use it). The site's JSON routes answer 428 `{ humanCheck: { route } }` when
 * a check is needed; `humanFetch` earns a pass and sends the request again:
 *
 *   const response = await humanFetch("/api/storage/uploads", { method: "POST", … });
 *
 * Earning a pass asks /api/check/challenge what's needed: nothing, a proof-of-work
 * (solved here, in slices, then posted to /api/check/solve), or the puzzle, shown in
 * a dialog (/api/check/puzzle). The server sets the pass cookie; this code never
 * sees it.
 */
import { buttonClasses, fieldClasses } from "@trilleo/ui/classes";
import { PUZZLE_SIZE } from "./puzzle";
import { solvePow } from "./pow";

/** HTTP 428 Precondition Required: the answer to a request that needs a check. */
export const HUMAN_CHECK_STATUS = 428;

export interface HumanCheckOptions {
  /** Told what's happening ("Checking you're not a bot… 40%"), or null when done. */
  onStatus?: (text: string | null) => void;
  /** The fetch to talk to the check's own routes with. */
  fetch?: typeof fetch;
}

function post(
  run: typeof fetch,
  path: string,
  body: unknown,
): Promise<Response> {
  return run(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}

/** "Checking you're not a bot… 63%": the chance it's found by now. */
export function progressText(tried: number, expected: number): string {
  const share = Math.min(
    99,
    Math.round(100 * (1 - Math.exp(-tried / expected))),
  );
  return `Checking you’re not a bot… ${String(share)}%`;
}

interface Challenge {
  level: number;
  token?: string;
  salt?: string;
  bits?: number;
}

export interface PuzzleData {
  token: string;
  target: string;
  /** Each square's drawing: SVG made by the site (lib/captcha), never by visitors. */
  cells: string[];
  question: string;
}

/**
 * Gets a pass for `route` if one's needed. True: go ahead (a pass is set, or none
 * was needed). False: the visitor closed the puzzle, or the check couldn't be done.
 */
export async function earnPass(
  route: string,
  options: HumanCheckOptions = {},
): Promise<boolean> {
  const run = options.fetch ?? fetch;
  const status = options.onStatus ?? (() => undefined);
  const response = await post(run, "/api/check/challenge", { route });
  if (!response.ok) return false;
  const challenge = (await response.json()) as Challenge;
  if (challenge.level === 0) return true;
  if (challenge.token && challenge.salt && challenge.bits) {
    const { bits, salt, token } = challenge;
    status(progressText(0, 2 ** bits));
    const nonce = await solvePow(salt, bits, {
      onProgress: (tried) => {
        status(progressText(tried, 2 ** bits));
      },
    });
    const solved = await post(run, "/api/check/solve", { route, token, nonce });
    status(null);
    return solved.ok;
  }
  status(null);
  return solvePuzzleDialog(route, run);
}

let dialogCount = 0;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Shows a puzzle in a <dialog> until it's solved (true) or closed (false). */
export function solvePuzzleDialog(
  route: string,
  run: typeof fetch = fetch,
): Promise<boolean> {
  const id = `human-check-${String(++dialogCount)}`;
  const dialog = element("dialog", "human-check-dialog");
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  const form = element("form", "flex flex-col gap-5");
  form.method = "dialog";
  form.noValidate = true;

  const head = element("div", "flex flex-col gap-3");
  head.append(
    element("p", "type-label text-muted", "Human check"),
    Object.assign(element("h2", "type-card", "One quick check"), {
      id: `${id}-title`,
    }),
    element(
      "p",
      "text-muted",
      "A lot has been sent from your network lately, so the site wants to be sure you’re a person.",
    ),
  );
  const alert = element("p", "border-l-2 border-accent pl-3");
  alert.setAttribute("role", "alert");
  alert.hidden = true;

  const fieldset = element("fieldset", "flex flex-col gap-3");
  const legend = element("legend", "mb-1 font-medium");
  const grid = element("div", "grid gap-1.5");
  grid.style.gridTemplateColumns = `repeat(${String(PUZZLE_SIZE)}, minmax(0, 1fr))`;
  const hint = element(
    "p",
    "text-sm text-muted",
    "Can’t see the pictures? Answer the question below instead.",
  );
  hint.id = `${id}-hint`;
  fieldset.setAttribute("aria-describedby", hint.id);
  fieldset.append(legend, grid, hint);

  const textWrap = element("div", "flex flex-col gap-2");
  const textLabel = element("label", "font-medium");
  const textInput = element("input", `${fieldClasses} px-3 py-2.5 text-base`);
  textInput.id = `${id}-text`;
  textInput.type = "text";
  textInput.autocomplete = "off";
  textInput.spellcheck = false;
  textInput.maxLength = 40;
  textLabel.htmlFor = textInput.id;
  textWrap.append(textLabel, textInput);

  const buttons = element("div", "flex flex-wrap gap-3");
  const submit = element(
    "button",
    buttonClasses({ hover: "plain" }),
    "Continue",
  );
  submit.type = "submit";
  const cancel = element(
    "button",
    buttonClasses({ hover: "plain", variant: "secondary" }),
    "Cancel",
  );
  cancel.type = "button";
  buttons.append(submit, cancel);

  form.append(head, alert, fieldset, textWrap, buttons);
  dialog.append(form);
  document.body.append(dialog);

  let token = "";
  const load = async (): Promise<boolean> => {
    const response = await post(run, "/api/check/puzzle", { route });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      alert.textContent = body.error ?? "The check couldn’t be loaded.";
      alert.hidden = false;
      fieldset.hidden = true;
      textWrap.hidden = true;
      submit.hidden = true;
      return false;
    }
    const puzzle = (await response.json()) as PuzzleData & {
      answer?: number[];
      textAnswer?: string;
    };
    token = puzzle.token;
    legend.textContent = `Select every square with a ${puzzle.target}.`;
    textLabel.textContent = puzzle.question;
    textInput.value = "";
    // E2E only (the server sends answers in test mode).
    if (puzzle.answer) dialog.dataset.answer = puzzle.answer.join(",");
    if (puzzle.textAnswer) dialog.dataset.textAnswer = puzzle.textAnswer;
    grid.replaceChildren(
      ...puzzle.cells.map((svg, i) => {
        const cell = element(
          "label",
          "check-cell relative block aspect-square cursor-pointer border border-ink text-ink",
        );
        const box = element("input", "peer sr-only");
        box.type = "checkbox";
        box.value = String(i);
        const picture = element("span", "block size-full p-1.5");
        // The site's own drawing (cellSvg), not anything a visitor wrote.
        picture.innerHTML = svg;
        const name = element(
          "span",
          "sr-only",
          `Square ${String(i + 1)}: row ${String(Math.floor(i / PUZZLE_SIZE) + 1)}, column ${String((i % PUZZLE_SIZE) + 1)}`,
        );
        cell.append(box, picture, name);
        return cell;
      }),
    );
    return true;
  };

  return new Promise((resolve) => {
    const finish = (passed: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(passed);
    };
    cancel.addEventListener("click", () => {
      finish(false);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(false);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit.disabled = true;
      const cells = [
        ...grid.querySelectorAll<HTMLInputElement>("input:checked"),
      ].map((box) => Number(box.value));
      void post(run, "/api/check/solve", {
        route,
        token,
        cells,
        text: textInput.value,
      })
        .then(async (response) => {
          if (response.ok) {
            finish(true);
            return;
          }
          alert.textContent = "That wasn’t right. Here’s a new one.";
          alert.hidden = false;
          if (await load()) legend.focus();
        })
        .catch(() => {
          alert.textContent = "The check couldn’t be sent. Try again.";
          alert.hidden = false;
        })
        .finally(() => {
          submit.disabled = false;
        });
    });
    dialog.showModal();
    void load().then((ok) => {
      if (ok) grid.querySelector("input")?.focus();
    });
  });
}

/** The route a 428 answer names, if it's the human check's. */
export async function demandOf(response: Response): Promise<string | null> {
  if (response.status !== HUMAN_CHECK_STATUS) return null;
  try {
    const body = (await response.clone().json()) as {
      humanCheck?: { route?: unknown };
    };
    const route = body.humanCheck?.route;
    return typeof route === "string" ? route : null;
  } catch {
    return null;
  }
}

/**
 * fetch, but a 428 from the human check earns a pass and the request is sent once
 * more. If the check isn't passed, the 428 comes back as it was (its `error` says
 * why, for people). Request bodies must be resendable (strings, Blobs, FormData).
 */
export function humanFetch(
  base: typeof fetch = fetch,
  options: Omit<HumanCheckOptions, "fetch"> = {},
): typeof fetch {
  return async (input, init) => {
    const first = await base(input, init);
    const route = await demandOf(first);
    if (route === null) return first;
    const passed = await earnPass(route, { ...options, fetch: base }).catch(
      () => false,
    );
    return passed ? base(input, init) : first;
  };
}
