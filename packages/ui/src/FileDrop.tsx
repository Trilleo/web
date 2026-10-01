import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { buttonClasses } from "./Button";

export interface FileDropProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  /** The file input's `accept`, e.g. "image/*,audio/*". */
  accept?: string;
  /** The big line, e.g. "Drop a file here". */
  title: string;
  /** A smaller line under it. */
  hint?: string;
  /** Also take files pasted anywhere on the page (Ctrl/⌘+V). */
  acceptPaste?: boolean;
  className?: string;
}

/**
 * Where people hand a tool their files: drop them on the box, choose them with the
 * button, or paste them. Files never leave the browser; the tool gets them as File
 * objects.
 */
export function FileDrop({
  onFiles,
  multiple = false,
  accept,
  title,
  hint,
  acceptPaste = false,
  className,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const hintId = useId();

  // Read through a ref, so a new callback each render doesn't re-subscribe.
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!acceptPaste) return;
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      // Pasting text into a field is just typing.
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, [contenteditable]")
      )
        return;
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      onFilesRef.current(multiple ? files : files.slice(0, 1));
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [acceptPaste, multiple]);

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files);
  };

  return (
    <div
      className={`flex flex-col items-start gap-4 border border-dashed p-6 transition-colors duration-(--tr-dur-fast) ease-swiss md:p-8 ${over ? "border-accent bg-chip" : "border-ink"} ${className ?? ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        // Leaving for one of the box's own children isn't leaving.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOver(false);
      }}
      onDrop={onDrop}
      data-testid="file-drop"
    >
      <div className="flex flex-col gap-1">
        <p className="type-card">{title}</p>
        {hint && (
          <p id={hintId} className="text-muted">
            {hint}
          </p>
        )}
      </div>
      <button
        type="button"
        className={buttonClasses({ variant: "secondary" })}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {multiple ? "Choose files" : "Choose a file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        multiple={multiple}
        accept={accept}
        onChange={(event) => {
          take(event.currentTarget.files);
          // Choosing the same file again should still count.
          event.currentTarget.value = "";
        }}
        data-testid="file-input"
      />
    </div>
  );
}
