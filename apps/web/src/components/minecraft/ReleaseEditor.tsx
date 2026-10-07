/**
 * The release form. It's a real form that posts to its page (so it works without
 * JavaScript); on top of that, a new release can take its main file first: the file
 * is read here in the browser (@trilleo/mc-files) to fill in the version, Minecraft
 * versions, loaders and dependencies, and on saving the release is created (JSON)
 * and the file uploaded straight to storage, attached as the release's main file.
 */
import {
  blobSource,
  matchVersions,
  readHints,
  type FileHints,
} from "@trilleo/mc-files";
import { uploadFile } from "@trilleo/storage/client";
import { formatBytes } from "@trilleo/tool-kit/files";
import { Button, FileDrop, buttonClasses } from "@trilleo/ui";
import { useId, useMemo, useRef, useState, type SyntheticEvent } from "react";
import type { ReleaseEditorProps } from "../../lib/minecraft/creator";
import {
  CHANNELS,
  DEPENDENCY_KINDS,
  MC_LIMITS,
} from "../../lib/minecraft/catalog";
import { groupByLine } from "../../lib/minecraft/game-versions";
import type { DependencyDraft, ReleaseDraft } from "../../lib/minecraft/input";
import { attachUpload } from "./attach";

const input =
  "w-full border border-ink bg-paper px-3 py-2.5 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-accent";
const row = "grid-swiss gap-y-5 border-t border-ink pt-4 md:pt-5 xl:pt-6";
const heading = "type-label col-span-4 md:col-span-2 xl:col-span-2";
const body = "col-span-4 flex flex-col gap-5 md:col-span-6 xl:col-span-7";
const small =
  "type-label border border-ink px-2.5 py-1.5 text-ink hover:bg-ink hover:text-paper";

type Phase = "idle" | "reading" | "saving" | "uploading";

/** The kinds a file can be, as project types; used to warn about a mismatch. */
const KIND_LABELS: Record<FileHints["kind"], string> = {
  mod: "a mod",
  plugin: "a plugin",
  world: "a world",
  build: "a build",
  resource_pack: "a resource pack",
  data_pack: "a data pack",
};

export function ReleaseEditor(props: ReleaseEditorProps) {
  const isNew = props.releaseId === null;
  const [values, setValues] = useState<ReleaseDraft>(props.values);
  const [errors, setErrors] = useState(props.errors);
  const [notice, setNotice] = useState<string | null>(
    Object.keys(props.errors).length > 0
      ? (props.errors.form ?? "Not saved: check the fields marked below.")
      : props.notice,
  );
  const [file, setFile] = useState<File | null>(null);
  const [hints, setHints] = useState<FileHints | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeId = useId();

  const set = <K extends keyof ReleaseDraft>(
    key: K,
    value: ReleaseDraft[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const versionsKnown = useMemo(
    () => [...props.javaVersions, ...props.bedrockVersions],
    [props.javaVersions, props.bedrockVersions],
  );

  // --- The main file ---------------------------------------------------------

  const takeFile = async (dropped: File) => {
    setFile(dropped);
    setHints(null);
    setPhase("reading");
    const found = await readHints(blobSource(dropped, dropped.name)).catch(
      () => null,
    );
    setHints(found);
    setPhase("idle");
    if (!found) return;
    setValues((current) => {
      const next = { ...current };
      if (!next.version.trim() && found.version) next.version = found.version;
      if (next.gameVersions.length === 0 && found.gameVersions) {
        const list =
          found.edition === "bedrock"
            ? props.bedrockVersions
            : props.javaVersions;
        next.gameVersions = matchVersions(found.gameVersions, list).slice(
          0,
          MC_LIMITS.gameVersions,
        );
      }
      if (next.loaders.length === 0) {
        const allowed = new Set(props.loaders.map((loader) => loader.value));
        next.loaders = found.loaders.filter((loader) => allowed.has(loader));
      }
      if (next.dependencies.length === 0 && found.dependencies.length > 0) {
        next.dependencies = found.dependencies
          .slice(0, MC_LIMITS.dependencies)
          .map((dep) => ({
            kind: dep.kind,
            target: dep.url ? dep.name : dep.id,
            url: dep.url ?? "",
          }));
      }
      return next;
    });
  };

  const extension = file?.name.toLowerCase().split(".").pop() ?? "";
  const wrongType = file !== null && !props.extensions.includes(extension);
  const mismatch =
    hints && hints.kind !== props.type
      ? `This looks like ${KIND_LABELS[hints.kind]}, but the project is ${KIND_LABELS[props.type]}.`
      : null;

  // --- Saving ----------------------------------------------------------------

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    // Without a file to send, the form posts the ordinary way.
    if (!file || !formRef.current) return;
    event.preventDefault();
    if (wrongType) {
      setNotice(
        `The main file must be ${props.extensions.map((ext) => `.${ext}`).join(", ")}.`,
      );
      return;
    }
    setPhase("saving");
    setNotice(null);
    let releaseId: number;
    try {
      const response = await fetch(props.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(formRef.current),
      });
      const result = (await response.json()) as
        | { ok: true; releaseId: number }
        | { ok: false; errors: ReleaseEditorProps["errors"] };
      if (!result.ok) {
        setErrors(result.errors);
        setNotice(
          result.errors.form ?? "Not saved: check the fields marked below.",
        );
        setPhase("idle");
        document.getElementById(noticeId)?.scrollIntoView({ block: "center" });
        return;
      }
      releaseId = result.releaseId;
    } catch {
      setNotice(
        "Couldn’t reach the site. Check your connection and try again.",
      );
      setPhase("idle");
      return;
    }

    const page = `${props.releaseHrefBase}${String(releaseId)}/`;
    setPhase("uploading");
    try {
      await uploadFile(file, {
        purpose: "minecraft",
        onStarted: (stored) =>
          attachUpload(
            { project: props.projectId, release: releaseId, primary: true },
            stored.id,
          ),
        onProgress: ({ loaded, total }) => {
          setProgress(Math.floor((loaded / Math.max(total, 1)) * 100));
        },
      });
      window.location.assign(`${page}?done=created`);
    } catch (error) {
      // The release exists; its page offers the upload again.
      const message =
        error instanceof Error ? error.message : "The upload failed.";
      window.location.assign(
        `${page}?error=${encodeURIComponent(`Release saved, but its file didn’t upload: ${message}`)}#files`,
      );
    }
  };

  // --- Versions ----------------------------------------------------------------

  const selected = new Set(values.gameVersions);
  const toggleVersion = (id: string, on: boolean) => {
    set(
      "gameVersions",
      on
        ? versionsKnown.filter((known) => known === id || selected.has(known))
        : values.gameVersions.filter((known) => known !== id),
    );
  };
  const setLine = (ids: string[], on: boolean) => {
    const change = new Set(ids);
    set(
      "gameVersions",
      versionsKnown.filter((known) =>
        change.has(known) ? on : selected.has(known),
      ),
    );
  };
  const javaLines = groupByLine(props.javaVersions);

  const updateDependency = (
    index: number,
    change: Partial<DependencyDraft>,
  ) => {
    set(
      "dependencies",
      values.dependencies.map((dep, i) =>
        i === index ? { ...dep, ...change } : dep,
      ),
    );
  };

  const busy = phase === "saving" || phase === "uploading";
  const fieldError = (key: keyof ReleaseEditorProps["errors"]) => errors[key];

  return (
    <form
      ref={formRef}
      method="post"
      action={props.action}
      noValidate
      className="mt-7 flex flex-col gap-12 md:mt-8 xl:mt-12"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      {notice && (
        <p
          id={noticeId}
          role={Object.keys(errors).length > 0 ? "alert" : "status"}
          className="border-l-2 border-accent pl-4 type-lead"
        >
          {notice}
        </p>
      )}

      {isNew && (
        <div className={row}>
          <h2 className={heading}>Main file</h2>
          <div className={body}>
            {file ? (
              <div className="flex flex-col gap-3 border border-ink p-4 md:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-medium break-all">{file.name}</p>
                  <p className="flex gap-4 type-label text-muted">
                    <span>{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      className="group text-ink"
                      disabled={busy}
                      onClick={() => {
                        setFile(null);
                        setHints(null);
                      }}
                    >
                      <span className="link-wipe">Choose another</span>
                    </button>
                  </p>
                </div>
                <p className="text-muted" role="status">
                  {phase === "reading"
                    ? "Reading the file…"
                    : hints
                      ? [
                          hints.label,
                          hints.name && hints.version
                            ? `${hints.name} ${hints.version}`
                            : (hints.name ?? hints.version),
                          ...hints.notes,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "We couldn’t read details from it: fill the form in yourself."}
                </p>
                {hints && (
                  <p className="text-sm text-muted">
                    The form below was filled in from the file. Check it before
                    saving.
                  </p>
                )}
                {(wrongType || mismatch) && (
                  <p role="alert" className="border-l-2 border-accent pl-3">
                    {wrongType
                      ? `A ${props.typeLabel.toLowerCase()}’s main file is ${props.extensions.map((ext) => `.${ext}`).join(", ")}.`
                      : mismatch}
                  </p>
                )}
                {phase === "uploading" && (
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    className="h-1 w-full bg-chip"
                  >
                    <div
                      className="h-full bg-accent transition-[width] duration-(--tr-dur-fast) ease-swiss"
                      style={{ width: `${String(progress)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <FileDrop
                title="Drop the release’s main file"
                hint={`${props.extensions.map((ext) => `.${ext}`).join(", ")}. It’s read here to fill in the form; nothing is sent until you save.`}
                accept={props.extensions.map((ext) => `.${ext}`).join(",")}
                onFiles={(files) => {
                  const first = files[0];
                  if (first) void takeFile(first);
                }}
              />
            )}
          </div>
        </div>
      )}

      <div className={row}>
        <h2 className={heading}>Version</h2>
        <div className={body}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="version" className="font-medium">
                Version
              </label>
              <input
                id="version"
                name="version"
                value={values.version}
                onChange={(event) => {
                  set("version", event.target.value);
                }}
                placeholder="1.0.0"
                maxLength={MC_LIMITS.version}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={fieldError("version") ? true : undefined}
                aria-describedby="version-hint"
                className={input}
              />
              <p
                id="version-hint"
                className={`text-sm ${fieldError("version") ? "font-medium text-ink" : "text-muted"}`}
              >
                {fieldError("version") ?? "Its number: part of its address."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="font-medium">
                Name <span className="text-muted">(optional)</span>
              </label>
              <input
                id="title"
                name="title"
                value={values.title}
                onChange={(event) => {
                  set("title", event.target.value);
                }}
                placeholder="The Nether update"
                maxLength={MC_LIMITS.releaseTitle * 2}
                aria-invalid={fieldError("title") ? true : undefined}
                aria-describedby={
                  fieldError("title") ? "title-error" : undefined
                }
                className={input}
              />
              {fieldError("title") && (
                <p id="title-error" className="text-sm font-medium">
                  {fieldError("title")}
                </p>
              )}
            </div>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="channel-label"
            className="flex flex-col gap-2"
          >
            <p id="channel-label" className="font-medium">
              Channel
            </p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel) => (
                <label
                  key={channel.value}
                  className={`relative press cursor-pointer border border-ink px-3 py-2 type-label has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${values.channel === channel.value ? "bg-ink text-paper" : "hover:bg-chip"}`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={channel.value}
                    className="sr-only"
                    checked={values.channel === channel.value}
                    onChange={() => {
                      set("channel", channel.value);
                    }}
                  />
                  {channel.label}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted">
              Download gets the newest release; betas and alphas only when asked
              for.
            </p>
          </div>
        </div>
      </div>

      <div role="group" aria-labelledby="versions-heading" className={row}>
        <h2 id="versions-heading" className={heading}>
          Minecraft versions
        </h2>
        <div className={body}>
          <p
            className={`text-sm ${fieldError("gameVersions") ? "font-medium text-ink" : "text-muted"}`}
            role={fieldError("gameVersions") ? "alert" : undefined}
          >
            {fieldError("gameVersions") ??
              `Tick every version it works with (${String(values.gameVersions.length)} ticked).`}
          </p>
          {javaLines.length > 0 && (
            <div className="flex flex-col border-b border-hair">
              {props.bedrockVersions.length > 0 && (
                <p className="pb-2 type-label">Java Edition</p>
              )}
              {javaLines.map((group, index) => {
                const ticked = group.versions.filter((id) => selected.has(id));
                const all = ticked.length === group.versions.length;
                return (
                  <details
                    key={group.line}
                    open={index < 2 || ticked.length > 0}
                    className="border-t border-hair py-2"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 py-1">
                      <span className="font-medium">{group.line}</span>
                      <span className="type-label text-muted">
                        {ticked.length} of {group.versions.length}
                      </span>
                    </summary>
                    <div className="flex flex-wrap items-center gap-2 pt-2 pb-1">
                      {group.versions.map((id) => (
                        <label
                          key={id}
                          className={`cursor-pointer border px-2.5 py-1.5 type-label has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${selected.has(id) ? "border-ink bg-ink text-paper" : "border-hair hover:border-ink"}`}
                        >
                          <input
                            type="checkbox"
                            name="gameVersions"
                            value={id}
                            className="sr-only"
                            checked={selected.has(id)}
                            onChange={(event) => {
                              toggleVersion(id, event.target.checked);
                            }}
                          />
                          {id}
                        </label>
                      ))}
                      {group.versions.length > 1 && (
                        <button
                          type="button"
                          className="group ml-1 type-label text-muted hover:text-ink"
                          onClick={() => {
                            setLine(group.versions, !all);
                          }}
                        >
                          <span className="link-wipe">
                            {all ? "None" : `All of ${group.line}`}
                          </span>
                        </button>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
          {props.bedrockVersions.length > 0 && (
            <div className="flex flex-col gap-2">
              {props.javaVersions.length > 0 && (
                <p className="type-label">Bedrock Edition</p>
              )}
              <div className="flex flex-wrap gap-2">
                {props.bedrockVersions.map((id) => (
                  <label
                    key={id}
                    className={`cursor-pointer border px-2.5 py-1.5 type-label has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${selected.has(id) ? "border-ink bg-ink text-paper" : "border-hair hover:border-ink"}`}
                  >
                    <input
                      type="checkbox"
                      name="gameVersions"
                      value={id}
                      className="sr-only"
                      checked={selected.has(id)}
                      onChange={(event) => {
                        toggleVersion(id, event.target.checked);
                      }}
                    />
                    {id}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {props.loaders.length > 0 && (
        <div role="group" aria-labelledby="loaders-heading" className={row}>
          <h2 id="loaders-heading" className={heading}>
            {props.type === "plugin" ? "Platforms" : "Loaders"}
          </h2>
          <div className={body}>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {props.loaders.map((loader) => (
                <label key={loader.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="loaders"
                    value={loader.value}
                    checked={values.loaders.includes(loader.value)}
                    onChange={(event) => {
                      set(
                        "loaders",
                        event.target.checked
                          ? [...values.loaders, loader.value]
                          : values.loaders.filter((l) => l !== loader.value),
                      );
                    }}
                    className="size-4 accent-accent"
                  />
                  {loader.label}
                </label>
              ))}
            </div>
            <p
              className={`text-sm ${fieldError("loaders") ? "font-medium text-ink" : "text-muted"}`}
            >
              {fieldError("loaders") ??
                (props.needsLoader
                  ? "Tick at least one."
                  : "Leave empty for Bedrock add-ons.")}
            </p>
          </div>
        </div>
      )}

      <div role="group" aria-labelledby="deps-heading" className={row}>
        <h2 id="deps-heading" className={heading}>
          Dependencies
        </h2>
        <div className={body}>
          <p className="text-sm text-muted">
            What it needs, works with, or clashes with. A project here: its
            address (or the last part of it). One elsewhere: its name and a
            link.
          </p>
          {values.dependencies.length > 0 && (
            <ol className="flex flex-col gap-4">
              {values.dependencies.map((dep, index) => {
                const key = `dependency-${String(index)}` as const;
                const depError = errors[key];
                const n = String(index);
                return (
                  <li
                    key={index}
                    className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <label className="sr-only" htmlFor={`dep-kind-${n}`}>
                      Dependency {index + 1}: how
                    </label>
                    <select
                      id={`dep-kind-${n}`}
                      name={`dep-kind-${n}`}
                      value={dep.kind}
                      onChange={(event) => {
                        updateDependency(index, { kind: event.target.value });
                      }}
                      className={input}
                    >
                      {DEPENDENCY_KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`dep-target-${n}`}>
                      Dependency {index + 1}: project
                    </label>
                    <input
                      id={`dep-target-${n}`}
                      name={`dep-target-${n}`}
                      value={dep.target}
                      onChange={(event) => {
                        updateDependency(index, { target: event.target.value });
                      }}
                      placeholder="fabric-api, or a name"
                      aria-invalid={depError ? true : undefined}
                      className={input}
                    />
                    <label className="sr-only" htmlFor={`dep-url-${n}`}>
                      Dependency {index + 1}: link, for one elsewhere
                    </label>
                    <input
                      id={`dep-url-${n}`}
                      name={`dep-url-${n}`}
                      value={dep.url}
                      onChange={(event) => {
                        updateDependency(index, { url: event.target.value });
                      }}
                      placeholder="https:// (elsewhere)"
                      inputMode="url"
                      aria-invalid={depError ? true : undefined}
                      className={input}
                    />
                    <button
                      type="button"
                      className={small}
                      onClick={() => {
                        set(
                          "dependencies",
                          values.dependencies.filter((_, i) => i !== index),
                        );
                      }}
                      aria-label={`Remove dependency ${String(index + 1)}`}
                    >
                      Remove
                    </button>
                    {depError && (
                      <p className="text-sm font-medium md:col-span-4">
                        {depError}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {values.dependencies.length < MC_LIMITS.dependencies && (
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  set("dependencies", [
                    ...values.dependencies,
                    { kind: "required", target: "", url: "" },
                  ]);
                }}
              >
                Add dependency
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={row}>
        <h2 className={heading}>Changelog</h2>
        <div className={body}>
          <label htmlFor="changelog" className="sr-only">
            Changelog
          </label>
          <textarea
            id="changelog"
            name="changelog"
            rows={8}
            value={values.changelog}
            onChange={(event) => {
              set("changelog", event.target.value);
            }}
            aria-invalid={fieldError("changelog") ? true : undefined}
            aria-describedby="changelog-hint"
            className={`${input} font-serif leading-relaxed`}
          />
          <p
            id="changelog-hint"
            className={`text-sm ${fieldError("changelog") ? "font-medium text-ink" : "text-muted"}`}
          >
            {fieldError("changelog") ??
              "What’s new or fixed. Markdown, like the description."}
          </p>
        </div>
      </div>

      <div className={row}>
        <div className="col-span-4 flex flex-wrap items-center gap-3 md:col-span-6 md:col-start-3 xl:col-start-3">
          <button type="submit" className={buttonClasses()} disabled={busy}>
            {phase === "saving"
              ? "Saving…"
              : phase === "uploading"
                ? `Uploading… ${String(progress)}%`
                : isNew
                  ? file
                    ? "Create release and upload"
                    : "Create release"
                  : "Save release"}
          </button>
          <a
            href={props.cancelHref}
            className={buttonClasses({ variant: "secondary" })}
          >
            Cancel
          </a>
        </div>
      </div>
    </form>
  );
}
