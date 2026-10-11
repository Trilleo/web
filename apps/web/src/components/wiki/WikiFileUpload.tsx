/**
 * Uploading pictures to a wiki: the storage uploader, each upload attached to the wiki
 * as it starts (so a member's picture is published once scanned). The list beside it
 * is the server's; a link reloads it once pictures are in.
 */
import { FileUpload } from "@trilleo/storage/react";
import { UploadError } from "@trilleo/storage/client";
import { useMemo, useState } from "react";

export interface WikiFileUploadProps {
  /** Where to attach uploads: /<wiki>/-/files/attach. */
  attachUrl: string;
  accept: string;
  hint: string;
}

async function attach(url: string, fileId: string): Promise<void> {
  const response = await fetch(url, {
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

export default function WikiFileUpload({
  attachUrl,
  accept,
  hint,
}: WikiFileUploadProps) {
  const [uploaded, setUploaded] = useState(0);
  const uploadOptions = useMemo(
    () => ({
      onStarted: (file: { id: string }) => attach(attachUrl, file.id),
    }),
    [attachUrl],
  );
  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        purpose="wiki-media"
        accept={accept}
        title="Drop pictures"
        hint={hint}
        uploadOptions={uploadOptions}
        onUploaded={() => {
          setUploaded((n) => n + 1);
        }}
      />
      {uploaded > 0 && (
        <p role="status">
          <button
            type="button"
            className="underline"
            onClick={() => {
              window.location.reload();
            }}
          >
            Show {uploaded === 1 ? "the new picture" : "the new pictures"}
          </button>{" "}
          in the list.
        </p>
      )}
    </div>
  );
}
