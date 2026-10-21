/**
 * Attaching files to a post: the storage uploader, each upload kept for this post
 * as it starts (/api/forum/attach), and a hidden `attachments` field per file so
 * the form sends them with the post. Uploads go straight to storage, so this needs
 * JavaScript; the form says so without it.
 */
import { UploadError } from "@trilleo/storage/client";
import { FileUpload } from "@trilleo/storage/react";
import { useMemo, useState } from "react";

export interface ForumAttachmentsProps {
  accept: string;
  /** How many more files this post can take. */
  room: number;
  hint: string;
}

async function keep(fileId: string): Promise<void> {
  const response = await fetch("/api/forum/attach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: fileId }),
  });
  if (response.ok) return;
  let message = `Something went wrong (${String(response.status)}). Try again.`;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") message = body.error;
  } catch {
    // Not JSON: keep the general message.
  }
  throw new UploadError(message, response.status);
}

export default function ForumAttachments({
  accept,
  room,
  hint,
}: ForumAttachmentsProps) {
  const [ids, setIds] = useState<string[]>([]);
  const uploadOptions = useMemo(
    () => ({
      onStarted: async (file: { id: string }) => {
        await keep(file.id);
        setIds((current) => [...current, file.id]);
      },
    }),
    [],
  );
  return (
    <div className="flex flex-col gap-2" data-forum-attachments>
      {ids.map((id) => (
        <input key={id} type="hidden" name="attachments" value={id} />
      ))}
      {ids.length < room ? (
        <FileUpload
          purpose="forum"
          accept={accept}
          multiple
          title="Attach files"
          hint={hint}
          uploadOptions={uploadOptions}
        />
      ) : (
        <p className="text-sm text-muted">
          That’s as many files as a post can have.
        </p>
      )}
    </div>
  );
}
