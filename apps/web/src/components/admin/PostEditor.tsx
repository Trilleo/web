/**
 * The admin's post editor: Markdown on one side, the post as readers will see it on
 * the other (rendered by the server, so it matches exactly). It's a real form that
 * posts to its own page; on top of that it autosaves drafts, keeps a local backup of
 * unsaved edits to live posts, uploads images dropped or pasted into the text, and
 * saves on Ctrl/⌘+S.
 */
import { Button, buttonClasses } from "@trilleo/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type SyntheticEvent,
  type ReactNode,
} from "react";
import type { EditorProps, EditorValues } from "../../lib/blog/editor";
import type { PostErrors, PostField } from "../../lib/blog/input";
import { POST_LIMITS, slugify } from "../../lib/blog/input";
import { readingMinutes } from "../../lib/posts";

/** Drafts save this long after typing stops. */
export const AUTOSAVE_DELAY_MS = 1500;
const PREVIEW_DELAY_MS = 300;
const BACKUP_PREFIX = "trilleo:post-backup:";

const COMMENT_MODE_OPTIONS: readonly {
  value: EditorValues["commentMode"];
  label: string;
  hint: string;
}[] = [
  { value: "open", label: "Open", hint: "Anyone signed in can comment." },
  {
    value: "closed",
    label: "Closed",
    hint: "Existing comments show; no new ones.",
  },
  { value: "off", label: "Off", hint: "No comments section at all." },
];

type SaveStatus = "idle" | "saving" | "saved" | "invalid" | "failed";

const fieldClass =
  "w-full border border-ink bg-paper text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-2 focus:outline-accent aria-[invalid=true]:border-accent";

/** "2026-10-01T08:00:00.000Z" → "2026-10-01T10:00" in the browser's time zone. */
export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The reverse: a datetime-local value (local time) → ISO, or "" if empty/invalid. */
export function fromLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

function noSubscription(): () => void {
  return () => {
    // The stored backup is read once per page view; nothing to follow.
  };
}

const backupReads = new Map<string, string | null>();

/** A live post's backup as it was when the page loaded (later writes don't count). */
function readBackupOnce(key: string): string | null {
  if (!backupReads.has(key)) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(key);
    } catch {
      // Storage can be unavailable (private windows); the backup is a convenience.
    }
    backupReads.set(key, stored);
  }
  return backupReads.get(key) ?? null;
}

function sameValues(a: EditorValues, b: EditorValues): boolean {
  return (Object.keys(a) as (keyof EditorValues)[]).every(
    (key) => a[key] === b[key],
  );
}

function Row({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid-swiss scroll-mt-6 gap-y-5 border-t border-ink pt-4 md:pt-5 xl:pt-6"
      id={id ? `${id}-row` : undefined}
    >
      <h2 id={id} className="col-span-4 type-label md:col-span-2 xl:col-span-2">
        {label}
      </h2>
      <div className="col-span-4 flex flex-col gap-5 md:col-span-6 xl:col-span-10">
        {children}
      </div>
    </section>
  );
}

function FieldError({ id, error }: { id: string; error: string | undefined }) {
  if (!error) return null;
  return (
    <p id={id} className="border-l-2 border-accent pl-2 type-label text-ink">
      {error}
    </p>
  );
}

export function PostEditor(props: EditorProps) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState(props.id);
  const [values, setValues] = useState(props.values);
  const [errors, setErrors] = useState<PostErrors>(props.errors);
  // A new post's slug follows its title until it's edited by hand.
  const [slugFollows, setSlugFollows] = useState(
    props.id === null &&
      (props.values.slug === "" ||
        props.values.slug === slugify(props.values.title)),
  );
  const [saved, setSaved] = useState(props.values);
  const [savedAt, setSavedAt] = useState(props.savedAt);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [backupDismissed, setBackupDismissed] = useState(false);
  // "Now" for scheduling hints, fixed per page view (render must stay pure).
  const [now] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const submitting = useRef(false);
  /** An autosave on its way; a submit waits for it (it may be creating the post). */
  const pendingSave = useRef<Promise<void> | null>(null);

  const action =
    id === null ? "/admin/posts/new/" : `/admin/posts/${String(id)}/`;
  const isDraft = props.state === "draft";
  const dirty = !sameValues(values, saved);
  const scheduledAhead =
    values.publishedAt !== "" && new Date(values.publishedAt).getTime() > now;

  const set = useCallback(
    <K extends keyof EditorValues>(key: K, value: EditorValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
      setErrors((current) => {
        if (!(key in current)) return current;
        return Object.fromEntries(
          Object.entries(current).filter(([field]) => field !== key),
        );
      });
    },
    [],
  );

  const onTitle = (event: ChangeEvent<HTMLInputElement>) => {
    const title = event.target.value;
    setValues((current) => ({
      ...current,
      title,
      slug: slugFollows ? slugify(title) : current.slug,
    }));
  };

  // Live preview, rendered by the server exactly as the post page will be.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/admin/posts/preview/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: values.body }),
        signal: controller.signal,
      })
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(new Error(String(response.status))),
        )
        .then((data: { html: string }) => {
          setPreviewHtml(data.html);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.error("Preview failed:", error);
            setPreviewHtml(null);
          }
        });
    }, PREVIEW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [values.body]);

  // Drafts save themselves shortly after typing stops.
  useEffect(() => {
    if (!isDraft || !dirty || !values.title.trim()) return;
    const timer = window.setTimeout(() => {
      const form = formRef.current;
      if (!form || submitting.current) return;
      const data = new FormData(form);
      data.set("intent", "save");
      const sent = values;
      setStatus("saving");
      pendingSave.current = fetch(action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          const result = (await response.json()) as
            | { ok: true; id: number; editUrl: string; savedAt: string }
            | { ok: false; errors: PostErrors };
          if (!result.ok) {
            setStatus("invalid");
            setErrors(result.errors);
            return;
          }
          setSaved(sent);
          setSavedAt(result.savedAt);
          setStatus("saved");
          if (id === null) {
            // Set on the form at once too: a submit waiting for this save goes there.
            form.action = result.editUrl;
            setId(result.id);
            setSlugFollows(false);
            history.replaceState(history.state, "", result.editUrl);
          }
        })
        .catch(() => {
          setStatus("failed");
        })
        .finally(() => {
          pendingSave.current = null;
        });
    }, AUTOSAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [values, dirty, isDraft, action, id]);

  // Live posts only change when saved on purpose; meanwhile edits are kept locally.
  const backupKey = id === null ? null : `${BACKUP_PREFIX}${String(id)}`;
  const storedBackup = useSyncExternalStore(
    noSubscription,
    () => (isDraft || !backupKey ? null : readBackupOnce(backupKey)),
    () => null,
  );
  const backup = useMemo(() => {
    if (backupDismissed || !storedBackup) return null;
    try {
      const parsed = JSON.parse(storedBackup) as {
        values: EditorValues;
        at: string;
      };
      return sameValues(parsed.values, props.values) ? null : parsed;
    } catch {
      return null;
    }
  }, [backupDismissed, storedBackup, props.values]);

  useEffect(() => {
    if (isDraft || !backupKey || !dirty) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          backupKey,
          JSON.stringify({ values, at: new Date().toISOString() }),
        );
      } catch {
        // See above.
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [values, dirty, isDraft, backupKey]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (submitting.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  // Ctrl/⌘+S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit(saveButtonRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onSubmit = (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    const pending = pendingSave.current;
    if (pending) {
      // Submitted mid-autosave: wait, then submit again (to the saved post's address).
      event.preventDefault();
      const submitter = event.nativeEvent.submitter;
      void pending.finally(() => {
        formRef.current?.requestSubmit(submitter);
      });
      return;
    }
    submitting.current = true;
    if (backupKey) {
      try {
        localStorage.removeItem(backupKey);
      } catch {
        // See above.
      }
    }
  };

  /** Puts text at the cursor in the Markdown (replacing any selection). */
  const insertText = useCallback((text: string) => {
    const area = bodyRef.current;
    setValues((current) => {
      const start = area?.selectionStart ?? current.body.length;
      const end = area?.selectionEnd ?? current.body.length;
      return {
        ...current,
        body: current.body.slice(0, start) + text + current.body.slice(end),
      };
    });
  }, []);

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) return;
      for (const file of images) {
        setUploadMessage(`Uploading ${file.name}…`);
        const data = new FormData();
        data.set("file", file);
        try {
          const response = await fetch("/admin/media/", {
            method: "POST",
            body: data,
          });
          const result = (await response.json()) as {
            url?: string;
            error?: string;
          };
          if (!response.ok || !result.url) {
            setUploadMessage(result.error ?? "The upload failed.");
            return;
          }
          const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
          insertText(`![${alt}](${result.url})\n`);
        } catch {
          setUploadMessage("The upload failed.");
          return;
        }
      }
      setUploadMessage(
        images.length === 1
          ? "Image added."
          : `${String(images.length)} images added.`,
      );
    },
    [insertText],
  );

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...event.clipboardData.files];
    if (files.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void upload(files);
    }
  };
  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const files = [...event.dataTransfer.files];
    if (files.length > 0) {
      event.preventDefault();
      void upload(files);
    }
  };

  const copyLink = () => {
    if (!props.previewUrl) return;
    void navigator.clipboard.writeText(props.previewUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  const described = (field: PostField, hint?: string) =>
    [errors[field] ? `${uid}-${field}-error` : null, hint]
      .filter(Boolean)
      .join(" ") || undefined;

  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "invalid"
        ? "Not saved: check the fields marked below."
        : status === "failed"
          ? "Not saved: the connection failed."
          : dirty
            ? isDraft
              ? "Unsaved changes"
              : "Unsaved changes (kept in this browser until you save)"
            : savedAt
              ? `Saved ${formatTime(savedAt)}`
              : "Not saved yet";

  const stateLabel = {
    draft: "Draft",
    scheduled: `Scheduled for ${values.publishedAt ? formatTime(values.publishedAt) : "—"}`,
    published: "Published",
  }[props.state];

  const words = values.body.split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-12">
      {props.notice && (
        <p role="status" className="border-l-2 border-accent pl-4 type-lead">
          {props.notice}
        </p>
      )}
      {backup && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 border-l-2 border-accent pl-4"
        >
          <p>
            This browser kept edits you didn’t save ({formatTime(backup.at)}).
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setValues(backup.values);
                setBackupDismissed(true);
              }}
            >
              Restore them
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (backupKey) localStorage.removeItem(backupKey);
                setBackupDismissed(true);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        method="post"
        action={action}
        onSubmit={onSubmit}
        className="flex flex-col gap-12"
        noValidate
      >
        <Row label="Post" id={`${uid}-post`}>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-title`} className="type-label">
              Title
            </label>
            <input
              id={`${uid}-title`}
              name="title"
              value={values.title}
              onChange={onTitle}
              maxLength={POST_LIMITS.title}
              required
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={described("title")}
              placeholder="Untitled"
              className={`${fieldClass} px-3 py-2 type-card`}
            />
            <FieldError id={`${uid}-title-error`} error={errors.title} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-slug`} className="type-label">
              Address
            </label>
            <div className="flex items-stretch">
              <span className="flex items-center border border-r-0 border-ink bg-chip px-3 type-label text-muted">
                /writing/
              </span>
              <input
                id={`${uid}-slug`}
                name="slug"
                value={values.slug}
                onChange={(event) => {
                  setSlugFollows(false);
                  set("slug", event.target.value.toLowerCase());
                }}
                maxLength={POST_LIMITS.slug}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={errors.slug ? true : undefined}
                aria-describedby={described("slug", `${uid}-slug-hint`)}
                className={`${fieldClass} h-11 px-3 font-mono text-sm`}
              />
            </div>
            <p id={`${uid}-slug-hint`} className="type-label text-muted">
              {slugFollows
                ? "Follows the title until you change it."
                : props.state === "draft"
                  ? "Lowercase letters, numbers and hyphens."
                  : "Changing it keeps the old address working as a redirect."}
            </p>
            <FieldError id={`${uid}-slug-error`} error={errors.slug} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-description`} className="type-label">
              Description
            </label>
            <textarea
              id={`${uid}-description`}
              name="description"
              value={values.description}
              onChange={(event) => {
                set("description", event.target.value);
              }}
              maxLength={POST_LIMITS.description}
              rows={2}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={described(
                "description",
                `${uid}-description-hint`,
              )}
              className={`${fieldClass} px-3 py-2 font-serif text-lg`}
            />
            <p id={`${uid}-description-hint`} className="type-label text-muted">
              Shown under the title, in feeds and in search results.
            </p>
            <FieldError
              id={`${uid}-description-error`}
              error={errors.description}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${uid}-tags`} className="type-label">
              Tags
            </label>
            <input
              id={`${uid}-tags`}
              name="tags"
              value={values.tags}
              onChange={(event) => {
                set("tags", event.target.value);
              }}
              placeholder="Astro, Self-hosting"
              aria-invalid={errors.tags ? true : undefined}
              aria-describedby={described("tags", `${uid}-tags-hint`)}
              className={`${fieldClass} h-11 px-3`}
            />
            <p id={`${uid}-tags-hint`} className="type-label text-muted">
              Separate tags with commas.
            </p>
            <FieldError id={`${uid}-tags-error`} error={errors.tags} />
          </div>
        </Row>

        <Row label="Text" id={`${uid}-text`}>
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
            <div className="flex xl:hidden" role="group" aria-label="View">
              {(["write", "preview"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => {
                    setMode(option);
                  }}
                  className={`press border border-ink px-3 py-2 type-label not-first:-ml-px ${mode === option ? "bg-ink text-paper" : "hover:bg-chip"}`}
                >
                  {option === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group cursor-pointer type-label"
              >
                <span className="link-wipe">Add image</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
                multiple
                hidden
                onChange={(event) => {
                  void upload([...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
              <span className="type-label text-muted">
                {words} {words === 1 ? "word" : "words"} ·{" "}
                {readingMinutes(values.body)} min
              </span>
            </div>
          </div>
          {uploadMessage && (
            <p role="status" className="type-label text-muted">
              {uploadMessage}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div
              className={`${mode === "preview" ? "hidden xl:flex" : "flex"} flex-col gap-2`}
            >
              <label htmlFor={`${uid}-body`} className="sr-only">
                Markdown
              </label>
              <textarea
                ref={bodyRef}
                id={`${uid}-body`}
                name="body"
                value={values.body}
                onChange={(event) => {
                  set("body", event.target.value);
                }}
                onPaste={onPaste}
                onDrop={onDrop}
                spellCheck
                aria-invalid={errors.body ? true : undefined}
                aria-describedby={described("body", `${uid}-body-hint`)}
                className={`${fieldClass} min-h-[32rem] resize-y px-4 py-3 font-mono text-sm leading-relaxed xl:min-h-[44rem]`}
              />
              <p id={`${uid}-body-hint`} className="type-label text-muted">
                Markdown, with footnotes ([^1]) and code blocks. Drop or paste
                images to upload them.
              </p>
              <FieldError id={`${uid}-body-error`} error={errors.body} />
            </div>
            <div
              className={`${mode === "write" ? "hidden xl:block" : "block"} min-h-[32rem] border border-hair px-5 py-4 xl:max-h-[44rem] xl:overflow-y-auto`}
              aria-label="Preview"
              role="region"
              aria-live="off"
            >
              {previewHtml === null ? (
                <p className="text-muted">The preview shows here.</p>
              ) : (
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </div>
        </Row>

        <Row label="Publishing" id={`${uid}-publishing`}>
          <p className="inline-flex items-center gap-2 type-label">
            <span
              className={`size-2 ${props.state === "published" ? "bg-ink" : "bg-accent"}`}
              aria-hidden="true"
            />
            {stateLabel}
            {props.publicUrl && (
              <a href={props.publicUrl} className="group ml-3">
                <span className="link-wipe">View post</span>
              </a>
            )}
          </p>

          {/* The date only needs room for its text; the comment modes take the rest. */}
          <div className="grid gap-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor={`${uid}-date`} className="type-label">
                {props.state === "draft" ? "Publish at" : "Published at"}
              </label>
              <input
                id={`${uid}-date`}
                type="datetime-local"
                value={toLocalInput(values.publishedAt)}
                onChange={(event) => {
                  set("publishedAt", fromLocalInput(event.target.value));
                }}
                aria-invalid={errors.publishedAt ? true : undefined}
                aria-describedby={described("publishedAt", `${uid}-date-hint`)}
                // Safari draws date inputs natively, with its own height and a minimum
                // width; without that they overflow the column and outgrow h-11.
                className={`${fieldClass} h-11 min-w-0 appearance-none px-3 accent-(--tr-accent) [&::-webkit-date-and-time-value]:text-left`}
              />
              <input
                type="hidden"
                name="publishedAt"
                value={values.publishedAt}
              />
              <p id={`${uid}-date-hint`} className="type-label text-muted">
                {props.state === "draft"
                  ? "Empty publishes now; a future time schedules it."
                  : "A future time takes it offline until then."}
              </p>
              <FieldError
                id={`${uid}-publishedAt-error`}
                error={errors.publishedAt}
              />
            </div>

            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 type-label">Comments</legend>
              {/* A segmented control, not a <select>: the native option list can't
                  take the site's colors. Real radios, so the form still posts it. */}
              <div className="flex">
                {COMMENT_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex h-11 flex-1 press cursor-pointer items-center justify-center border border-ink px-3 type-label not-first:-ml-px has-focus-visible:z-10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${values.commentMode === option.value ? "bg-ink text-paper" : "hover:bg-chip"}`}
                  >
                    <input
                      type="radio"
                      name="commentMode"
                      value={option.value}
                      checked={values.commentMode === option.value}
                      onChange={() => {
                        set("commentMode", option.value);
                      }}
                      aria-describedby={`${uid}-comments-hint`}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <p id={`${uid}-comments-hint`} className="type-label text-muted">
                {
                  COMMENT_MODE_OPTIONS.find(
                    (option) => option.value === values.commentMode,
                  )?.hint
                }
              </p>
            </fieldset>
          </div>

          {props.state === "published" && (
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                name="revised"
                className="size-4 accent-(--tr-accent)"
              />
              Mark this edit as an update (readers see “Updated” with today’s
              date)
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {props.state === "draft" ? (
              <>
                <button
                  ref={saveButtonRef}
                  type="submit"
                  name="intent"
                  value="save"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Save draft
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="publish"
                  className={buttonClasses()}
                >
                  {scheduledAhead ? "Schedule" : "Publish now"}
                </button>
              </>
            ) : (
              <>
                <button
                  ref={saveButtonRef}
                  type="submit"
                  name="intent"
                  value="save"
                  className={buttonClasses()}
                >
                  {props.state === "scheduled" ? "Save" : "Update"}
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="unpublish"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Unpublish
                </button>
              </>
            )}
            <p role="status" className="type-label text-muted">
              {statusText}
            </p>
          </div>
        </Row>
      </form>

      {id !== null && (
        <>
          {/* Separate forms: these act on the saved post, not the fields above. */}
          <Row label="Sharing" id="sharing">
            <p className="max-w-[40rem]">
              A secret link lets someone read this post before it’s published.
              It’s never indexed, and revoking it stops it working.
            </p>
            {props.previewUrl ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-stretch gap-2">
                  <label htmlFor={`${uid}-link`} className="sr-only">
                    Share link
                  </label>
                  <input
                    id={`${uid}-link`}
                    readOnly
                    value={props.previewUrl}
                    onFocus={(event) => {
                      event.target.select();
                    }}
                    className={`${fieldClass} h-11 min-w-0 flex-1 px-3 font-mono text-sm`}
                  />
                  <Button variant="secondary" onClick={copyLink}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <form method="post" action={action}>
                  <button
                    type="submit"
                    name="intent"
                    value="unlink"
                    className="group cursor-pointer type-label"
                  >
                    <span className="link-wipe">Revoke link</span>
                  </button>
                </form>
              </div>
            ) : (
              <form method="post" action={action}>
                <button
                  type="submit"
                  name="intent"
                  value="link"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Create share link
                </button>
              </form>
            )}
          </Row>

          <Row label="Delete" id={`${uid}-delete`}>
            <details className="flex flex-col gap-3">
              <summary className="w-fit cursor-pointer link-wipe type-label">
                Delete this post
              </summary>
              <form
                method="post"
                action={action}
                className="mt-3 flex flex-col gap-3"
              >
                <p className="max-w-[40rem]">
                  The post, its comments and its old addresses go for good.
                  Unpublishing keeps it as a draft instead.
                </p>
                <button
                  type="submit"
                  name="intent"
                  value="delete"
                  onClick={() => {
                    submitting.current = true;
                  }}
                  className={buttonClasses({ className: "w-fit" })}
                >
                  Yes, delete it
                </button>
              </form>
            </details>
          </Row>
        </>
      )}
    </div>
  );
}
