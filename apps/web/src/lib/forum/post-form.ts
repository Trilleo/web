/**
 * The post form's browser side (components/forum/PostForm.astro): a live preview
 * that follows the text, and drafts saved to the account as people type
 * (/api/forum/drafts), offered back when the form is opened again empty. Without
 * JavaScript the form still works; it just doesn't do these.
 */

const SAVE_AFTER_MS = 1200;
const PREVIEW_AFTER_MS = 500;

function debounce(run: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
}

async function send(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function enhance(form: HTMLFormElement): void {
  const body = form.querySelector<HTMLTextAreaElement>("[data-post-body]");
  const title = form.querySelector<HTMLInputElement>("[data-post-title]");
  const status = form.querySelector<HTMLElement>("[data-draft-status]");
  const preview = form.querySelector<HTMLElement>("[data-live-preview]");
  const previewBody = form.querySelector<HTMLElement>(
    "[data-live-preview-body]",
  );
  if (!body) return;

  // Live preview: the server renders it as it'll be saved.
  if (preview && previewBody) {
    let shown = "";
    const update = debounce(() => {
      const text = body.value;
      if (text.trim() === "") {
        preview.hidden = true;
        return;
      }
      if (text === shown) return;
      shown = text;
      void send("/api/forum/preview", {
        method: "POST",
        body: JSON.stringify({ body: text }),
      })
        .then((result) => {
          const html = (result as { html?: unknown }).html;
          if (typeof html === "string" && text === body.value) {
            previewBody.innerHTML = html;
            preview.hidden = false;
          }
        })
        .catch(() => undefined);
    }, PREVIEW_AFTER_MS);
    body.addEventListener("input", update);
    update();
  }

  // Drafts.
  const key = form.dataset.draftKey;
  if (!key) return;
  const say = (text: string) => {
    if (status) status.textContent = text;
  };
  const save = debounce(() => {
    void send("/api/forum/drafts", {
      method: "PUT",
      body: JSON.stringify({
        key,
        title: title?.value ?? "",
        body: body.value,
      }),
    })
      .then(() => {
        say("Draft saved");
      })
      .catch(() => {
        say("The draft couldn’t be saved");
      });
  }, SAVE_AFTER_MS);
  body.addEventListener("input", save);
  title?.addEventListener("input", save);

  // An empty form offers the saved draft back.
  if (body.value.trim() === "" && (title?.value.trim() ?? "") === "") {
    void send(`/api/forum/drafts?key=${encodeURIComponent(key)}`, {
      method: "GET",
    })
      .then((draft) => {
        if (!draft || typeof draft !== "object" || !status) return;
        const saved = draft as { title?: string; body?: string };
        const button = document.createElement("button");
        button.type = "button";
        button.className = "link-wipe cursor-pointer text-ink";
        button.textContent = "Continue your draft";
        button.addEventListener("click", () => {
          if (title && saved.title) title.value = saved.title;
          body.value = saved.body ?? "";
          body.dispatchEvent(new Event("input"));
          say("Draft restored");
          body.focus();
        });
        status.textContent = "You have a draft here. ";
        status.append(button);
      })
      .catch(() => undefined);
  }
}

export function enhancePostForms(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>(
    "[data-post-form]",
  ))
    enhance(form);
}
