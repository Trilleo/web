import type { FileVisibility } from "@trilleo/storage";
import { FileUpload } from "@trilleo/storage/react";
import { Choice } from "@trilleo/ui";
import { useState } from "react";

const VISIBILITIES: readonly { value: FileVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "private", label: "Private" },
];

/** The admin's uploader on /admin/files: site files, with a visibility choice. */
export default function FileUploader() {
  const [visibility, setVisibility] = useState<FileVisibility>("public");
  const [uploaded, setUploaded] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <Choice
        legend="Visibility"
        value={visibility}
        options={VISIBILITIES}
        onChange={setVisibility}
      />
      <FileUpload
        purpose="site"
        visibility={visibility}
        onUploaded={() => {
          setUploaded((n) => n + 1);
        }}
      />
      {uploaded > 0 && (
        <p role="status">
          <a href="/admin/files/" className="group">
            <span className="link-wipe">Refresh the list</span>
          </a>{" "}
          to see {uploaded === 1 ? "the new file" : "the new files"}.
        </p>
      )}
    </div>
  );
}
