/**
 * The human check in the browser. `enhanceHumanChecks` makes forms holding a
 * <HumanCheck> ask /api/check/challenge before sending, and solve the proof-of-work
 * there and then, so the /check/ detour isn't needed. `solvePowForm` runs the
 * proof-of-work on /check/ itself. If anything goes wrong the form is simply sent:
 * the server decides either way.
 */
import { solvePow } from "@trilleo/captcha";

interface Challenge {
  level: number;
  token?: string;
  salt?: string;
  bits?: number;
}

function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}

function showProgress(
  status: HTMLElement | null,
  tried: number,
  expected: number,
) {
  if (!status) return;
  // The chance of having found it by now (tries needed are random).
  const share = Math.min(
    99,
    Math.round(100 * (1 - Math.exp(-tried / expected))),
  );
  status.textContent = `Checking you’re not a bot… ${String(share)}%`;
}

/** Gets a pass for `route` if one's needed and can be had without the puzzle. */
async function pass(route: string, status: HTMLElement | null): Promise<void> {
  const response = await post("/api/check/challenge", { route });
  if (!response.ok) return;
  const challenge = (await response.json()) as Challenge;
  if (!challenge.token || !challenge.salt || !challenge.bits) return;
  if (status) {
    status.hidden = false;
    status.textContent = "Checking you’re not a bot…";
  }
  const { bits, salt, token } = challenge;
  const nonce = await solvePow(salt, bits, {
    onProgress: (tried) => {
      showProgress(status, tried, 2 ** bits);
    },
  });
  await post("/api/check/solve", { route, token, nonce });
  if (status) status.textContent = "Done. Sending…";
}

const enhanced = new WeakSet<HTMLFormElement>();

/** Forms with a [data-human-check] inside get the check before they're sent. */
export function enhanceHumanChecks(root: ParentNode = document): void {
  for (const marker of root.querySelectorAll<HTMLElement>(
    "[data-human-check]",
  )) {
    const form = marker.closest("form");
    const route = marker.dataset.humanCheck;
    if (!form || !route || enhanced.has(form)) continue;
    enhanced.add(form);
    const status = marker.querySelector<HTMLElement>("[data-human-status]");
    const intent = marker.dataset.humanIntent;
    let checked = false;
    form.addEventListener("submit", (event) => {
      const submitter = event.submitter;
      if (checked) return;
      if (
        intent !== undefined &&
        !(submitter instanceof HTMLButtonElement && submitter.value === intent)
      )
        return;
      event.preventDefault();
      const buttons = form.querySelectorAll<HTMLButtonElement>("button");
      for (const button of buttons) button.disabled = true;
      void pass(route, status)
        .catch(() => {
          // The server will send the visitor to /check/ if it still wants a check.
        })
        .finally(() => {
          checked = true;
          for (const button of buttons) button.disabled = false;
          form.requestSubmit(
            submitter instanceof HTMLButtonElement ? submitter : null,
          );
          checked = false;
        });
    });
  }
}

/** /check/'s proof-of-work form: solve it, fill in the nonce, send. */
export function solvePowForm(form: HTMLFormElement): void {
  const { salt, bits } = form.dataset;
  const nonceField = form.querySelector<HTMLInputElement>(
    '[name="_check_nonce"]',
  );
  const status = form.querySelector<HTMLElement>("[data-pow-status]");
  if (!salt || !bits || !nonceField) return;
  const expected = 2 ** Number(bits);
  void solvePow(salt, Number(bits), {
    onProgress: (tried) => {
      showProgress(status, tried, expected);
    },
  }).then((nonce) => {
    nonceField.value = String(nonce);
    if (status) status.textContent = "Done. Sending…";
    form.submit();
  });
}
