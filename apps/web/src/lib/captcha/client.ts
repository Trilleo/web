/**
 * The human check on the site's own forms. `enhanceHumanChecks` makes forms holding
 * a <HumanCheck> earn their pass before sending (@trilleo/captcha/client: the
 * proof-of-work here, or the puzzle in a dialog), so the /check/ detour isn't
 * needed. `solvePowForm` runs the proof-of-work on /check/ itself. If anything goes
 * wrong the form is simply sent: the server decides either way.
 */
import { solvePow } from "@trilleo/captcha";
import { earnPass, progressText } from "@trilleo/captcha/client";

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
    const send = (submitter: HTMLElement | null) => {
      checked = true;
      form.requestSubmit(
        submitter instanceof HTMLButtonElement ? submitter : null,
      );
      checked = false;
    };
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
      const show = (text: string | null) => {
        if (!status) return;
        status.hidden = text === null;
        status.textContent = text ?? "";
      };
      void earnPass(route, { onStatus: show })
        .then((passed) => {
          for (const button of buttons) button.disabled = false;
          // The puzzle was closed: nothing is sent.
          if (!passed) return;
          send(submitter);
        })
        .catch(() => {
          // The server will send the visitor to /check/ if it still wants a check.
          for (const button of buttons) button.disabled = false;
          send(submitter);
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
      if (status) status.textContent = progressText(tried, expected);
    },
  }).then((nonce) => {
    nonceField.value = String(nonce);
    if (status) status.textContent = "Done. Sending…";
    form.submit();
  });
}
