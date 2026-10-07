import { formatBytes } from "@trilleo/tool-kit/files";
import { FileDrop } from "@trilleo/ui";
import { useEffect, useRef, useState } from "react";
import type { StoredFileSummary } from "./api-types";
import { fetchFile, uploadFile, type UploadOptions } from "./client";
import type { FileStatus, FileVisibility } from "./moderation";

export interface FileUploadProps {
  /** The storage purpose the files are for (see the site's purpose registry). */
  purpose: string;
  visibility?: FileVisibility;
  multiple?: boolean;
  /** The file input's `accept`. */
  accept?: string;
  title?: string;
  hint?: string;
  /** Called once per file the site has accepted, with the file that was sent. */
  onUploaded?: (file: StoredFileSummary, source: File) => void;
  /** For tests. */
  uploadOptions?: Partial<UploadOptions>;
  /** How often to ask about a file that's still processing, in ms. */
  pollMs?: number;
}

type Stage = "queued" | "uploading" | "finishing" | "done" | "failed";

interface Item {
  key: number;
  file: File;
  stage: Stage;
  loaded: number;
  result?: StoredFileSummary;
  error?: string;
  controller: AbortController;
}

const STATUS_LABEL: Partial<Record<FileStatus, string>> = {
  processing: "Checking the file…",
  pending_review: "Uploaded: waiting for review",
  published: "Uploaded",
  rejected: "Refused",
};

function describe(item: Item): string {
  switch (item.stage) {
    case "queued":
      return "Waiting";
    case "uploading":
      return `${String(Math.floor((item.loaded / Math.max(item.file.size, 1)) * 100))}%`;
    case "finishing":
      return "Finishing…";
    case "failed":
      return item.error ?? "Failed";
    case "done":
      return item.result
        ? (STATUS_LABEL[item.result.status] ?? item.result.status)
        : "Uploaded";
  }
}

/**
 * Drop files to upload them to the site's storage: one at a time, each in parallel
 * parts, with progress, cancelling, and a link to each file's page when it's in.
 */
export function FileUpload({
  purpose,
  visibility,
  multiple = true,
  accept,
  title = multiple ? "Drop files to upload" : "Drop a file to upload",
  hint = "Up to 1 GB each.",
  onUploaded,
  uploadOptions,
  pollMs = 2000,
}: FileUploadProps) {
  const [items, setItems] = useState<Item[]>([]);
  const nextKey = useRef(1);
  const onUploadedRef = useRef(onUploaded);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  const update = (key: number, change: Partial<Item>) => {
    setItems((list) =>
      list.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  };

  // One upload at a time, in the order the files were added.
  const queue = useRef<Item[]>([]);
  const running = useRef(false);
  const options = useRef({ purpose, visibility, uploadOptions });
  useEffect(() => {
    options.current = { purpose, visibility, uploadOptions };
  });

  const pump = () => {
    if (running.current) return;
    const item = queue.current.shift();
    if (!item) return;
    running.current = true;
    const { key, file, controller } = item;
    update(key, { stage: "uploading" });
    uploadFile(file, {
      ...options.current.uploadOptions,
      purpose: options.current.purpose,
      visibility: options.current.visibility,
      signal: controller.signal,
      onProgress: ({ loaded }) => {
        update(key, { loaded });
      },
      onStage: (stage) => {
        update(key, { stage });
      },
    })
      .then(
        (result) => {
          update(key, { stage: "done", result });
          onUploadedRef.current?.(result, file);
        },
        (error: unknown) => {
          if (controller.signal.aborted) {
            setItems((list) => list.filter((other) => other.key !== key));
            return;
          }
          update(key, {
            stage: "failed",
            error:
              error instanceof Error ? error.message : "The upload failed.",
          });
        },
      )
      .finally(() => {
        running.current = false;
        pump();
      });
  };

  // Files still being checked: ask again until they're done.
  const processing = items.filter(
    (item) => item.result?.status === "processing",
  );
  const processingIds = processing.map((item) => item.result?.id).join(",");
  useEffect(() => {
    if (!processingIds) return;
    const timer = setTimeout(() => {
      for (const item of processing) {
        const id = item.result?.id;
        if (!id) continue;
        fetchFile(id, {
          endpoint: uploadOptions?.endpoint,
          fetch: uploadOptions?.fetch,
        }).then(
          (result) => {
            update(item.key, { result });
          },
          () => undefined,
        );
      }
    }, pollMs);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- polls per set of ids
  }, [processingIds, pollMs]);

  const add = (files: File[]) => {
    const added = files.map((file): Item => ({
      key: nextKey.current++,
      file,
      stage: "queued",
      loaded: 0,
      controller: new AbortController(),
    }));
    queue.current.push(...added);
    setItems((list) => [...list, ...added]);
    pump();
  };

  const cancel = (item: Item) => {
    item.controller.abort();
    if (item.stage === "queued") {
      queue.current = queue.current.filter((other) => other.key !== item.key);
      setItems((list) => list.filter((other) => other.key !== item.key));
    }
  };

  const dismiss = (key: number) => {
    setItems((list) => list.filter((item) => item.key !== key));
  };

  return (
    <div className="flex flex-col gap-6">
      <FileDrop
        onFiles={add}
        multiple={multiple}
        accept={accept}
        title={title}
        hint={hint}
      />
      {items.length > 0 && (
        <ul aria-label="Uploads" className="border-b border-ink">
          {items.map((item) => {
            const percent = Math.floor(
              (item.loaded / Math.max(item.file.size, 1)) * 100,
            );
            const running =
              item.stage === "uploading" || item.stage === "finishing";
            return (
              <li
                key={item.key}
                className="flex flex-col gap-2 border-t border-ink py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="min-w-0 font-medium break-all">
                    {item.result ? (
                      <a href={item.result.pageUrl} className="group">
                        <span className="link-wipe">{item.result.name}</span>
                      </a>
                    ) : (
                      item.file.name
                    )}
                  </p>
                  <p className="flex gap-4 type-label text-muted">
                    <span>{formatBytes(item.file.size)}</span>
                    <span
                      role={item.stage === "failed" ? "alert" : undefined}
                      className={item.stage === "failed" ? "text-ink" : ""}
                    >
                      {describe(item)}
                    </span>
                    {(item.stage === "queued" || running) && (
                      <button
                        type="button"
                        className="group text-ink"
                        onClick={() => {
                          cancel(item);
                        }}
                        aria-label={`Cancel ${item.file.name}`}
                      >
                        <span className="link-wipe">Cancel</span>
                      </button>
                    )}
                    {(item.stage === "failed" || item.stage === "done") && (
                      <button
                        type="button"
                        className="group text-ink"
                        onClick={() => {
                          dismiss(item.key);
                        }}
                        aria-label={`Dismiss ${item.file.name}`}
                      >
                        <span className="link-wipe">Dismiss</span>
                      </button>
                    )}
                  </p>
                </div>
                {running && (
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1 w-full bg-chip"
                  >
                    <div
                      className="h-full bg-accent transition-[width] duration-(--tr-dur-fast) ease-swiss"
                      style={{ width: `${String(percent)}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
