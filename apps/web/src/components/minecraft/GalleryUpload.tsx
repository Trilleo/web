/**
 * Adding pictures to a project's gallery: the storage uploader, with each upload
 * attached to the gallery as it starts. The list below it is the server's; once
 * pictures are in, a link reloads it.
 */
import { FileUpload } from "@trilleo/storage/react";
import { useMemo, useState } from "react";
import { attachUpload } from "./attach";

export interface GalleryUploadProps {
  projectId: number;
  /** Pictures the gallery still has room for. */
  room: number;
  accept: string;
  hint: string;
}

export default function GalleryUpload({
  projectId,
  room,
  accept,
  hint,
}: GalleryUploadProps) {
  const [uploaded, setUploaded] = useState(0);
  const uploadOptions = useMemo(
    () => ({
      onStarted: (file: { id: string }) =>
        attachUpload({ project: projectId }, file.id),
    }),
    [projectId],
  );
  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        purpose="minecraft-media"
        accept={accept}
        title={room === 1 ? "Drop a picture" : "Drop pictures"}
        hint={`${hint} Room for ${String(room)} more.`}
        uploadOptions={uploadOptions}
        onUploaded={() => {
          setUploaded((n) => n + 1);
        }}
      />
      {uploaded > 0 && (
        <p role="status">
          <button
            type="button"
            className="group"
            onClick={() => {
              window.location.reload();
            }}
          >
            <span className="link-wipe">
              Show {uploaded === 1 ? "the new picture" : "the new pictures"}
            </span>
          </button>{" "}
          in the gallery below.
        </p>
      )}
    </div>
  );
}
