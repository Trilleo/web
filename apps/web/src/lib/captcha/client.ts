/**
 * The human check on the site's own forms. `enhanceHumanChecks` makes forms holding
 * a <HumanCheck> earn their pass before sending (@trilleo/captcha/client: the
 * proof-of-work here, or the puzzle in a dialog), so the /check/ detour isn't
 * needed. `solvePowForm` runs the proof-of-work on /check/ itself. If anything goes
 * wrong the form is simply sent: the server decides either way.
 */
import { solvePow } from "@trilleo/captcha";
import { earnPass, progressText } from "@trilleo/captcha/client";

let listening = false;
/** Forms sent again once their pass is earned: let through this time. */
const passing = new WeakSet<HTMLFormElement>();

/**
 * Forms with a [data-human-check] inside get the check before they're sent. One
 * listener on the document, so forms that arrive later (server islands) are
 * covered too.
 */
export function enhanceHumanChecks(): void {
  if (listening) return;
  listening = true;
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (event.defaultPrevented) return;
    if (!(form instanceof HTMLFormElement) || passing.has(form)) return;
    const marker = form.querySelector<HTMLElement>("[data-human-check]");
    const route = marker?.dataset.humanCheck;
    if (!marker || !route) return;
    // The page said none is needed: send it as it is (the server still decides).
    if (marker.dataset.humanLevel === "0") return;
    const submitter = event.submitter;
    const intent = marker.dataset.humanIntent;
    if (
      intent !== undefined &&
      !(submitter instanceof HTMLButtonElement && submitter.value === intent)
    )
      return;
    event.preventDefault();
    const status = marker.querySelector<HTMLElement>("[data-human-status]");
    const buttons = form.querySelectorAll<HTMLButtonElement>("button");
    for (const button of buttons) button.disabled = true;
    const show = (text: string | null) => {
      if (!status) return;
      status.hidden = text === null;
      status.textContent = text ?? "";
    };
    const send = () => {
      for (const button of buttons) button.disabled = false;
      passing.add(form);
      form.requestSubmit(
        submitter instanceof HTMLButtonElement ? submitter : null,
      );
      passing.delete(form);
    };
    void earnPass(route, { onStatus: show })
      .then((passed) => {
        // The puzzle was closed: nothing is sent.
        if (passed) send();
        else for (const button of buttons) button.disabled = false;
      })
      // The server will send the visitor to /check/ if it still wants a check.
      .catch(send);
  });
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
      if (status) status.textContent = progressText(tried, expected);
    },
  }).then((nonce) => {
    nonceField.value = String(nonce);
    if (status) status.textContent = "Done. Sending…";
    form.submit();
  });
}
