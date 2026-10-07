/**
 * Adding files to a release that exists: its main file (what Download gets; a new
 * one replaces the old, which stays as an extra) or extras (sources, a Bedrock
 * version, a readme). Each upload is attached as it starts.
 */
import { FileUpload } from "@trilleo/storage/react";
import { Choice } from "@trilleo/ui";
import { useMemo, useState } from "react";
import { attachUpload } from "./attach";
import { isPreviewableName, makeBuildPreview } from "./build-preview";

export interface ReleaseFileUploadProps {
  projectId: number;
  releaseId: number;
  /** Extensions a main file may have. */
  mainExtensions: string[];
  /** Extensions any release file may have. */
  extraExtensions: string[];
  /** Whether the release has a main file yet. */
  hasMain: boolean;
  /** Extra files it still has room for. */
  extraRoom: number;
  /** A build: its files get a 3D preview, made here after upload. */
  previewable: boolean;
  /** The gallery is empty: the first preview also makes an isometric cover. */
  needsCover: boolean;
}

type Role = "main" | "extra";

export default function ReleaseFileUpload({
  projectId,
  releaseId,
  mainExtensions,
  extraExtensions,
  hasMain,
  extraRoom,
  previewable,
  needsCover,
}: ReleaseFileUploadProps) {
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [coverMade, setCoverMade] = useState(!needsCover);
  const [role, setRole] = useState<Role>(hasMain ? "extra" : "main");
  const [uploaded, setUploaded] = useState(0);
  const extensions = role === "main" ? mainExtensions : extraExtensions;
  const uploadOptions = useMemo(
    () => ({
      onStarted: (file: { id: string }) =>
        attachUpload(
          { project: projectId, release: releaseId, primary: role === "main" },
          file.id,
        ),
    }),
    [projectId, releaseId, role],
  );
  return (
    <div className="flex flex-col gap-5">
      <Choice<Role>
        legend="Add as"
        value={role}
        onChange={setRole}
        options={[
          { value: "main", label: hasMain ? "New main file" : "Main file" },
          { value: "extra", label: "Extra file", disabled: extraRoom <= 0 },
        ]}
      />
      <FileUpload
        // A new uploader per role, so its accept list and options match.
        key={role}
        purpose="minecraft"
        multiple={role === "extra"}
        accept={extensions.map((ext) => `.${ext}`).join(",")}
        title={role === "main" ? "Drop the main file" : "Drop extra files"}
        hint={`${extensions.map((ext) => `.${ext}`).join(", ")}.${role === "main" && hasMain ? " The current main file becomes an extra." : ""}`}
        uploadOptions={uploadOptions}
        onUploaded={(stored, source) => {
          setUploaded((n) => n + 1);
          if (!previewable || !isPreviewableName(source.name)) return;
          setPreviewNote(`Making the 3D preview of ${source.name}…`);
          void makeBuildPreview(source, stored.id, {
            ...(coverMade ? {} : { coverFor: projectId }),
          }).then((made) => {
            if (made.cover) setCoverMade(true);
            setPreviewNote(
              made.problem
                ? `No 3D preview for ${source.name}: ${made.problem}`
                : `3D preview of ${source.name} saved${made.cover ? ", with a cover picture" : ""}.`,
            );
          });
        }}
      />
      {previewNote && <p role="status">{previewNote}</p>}
      {uploaded > 0 && (
        <p role="status">
          <button
            type="button"
            className="group"
            onClick={() => {
              window.location.reload();
            }}
          >
            <span className="link-wipe">Show the new files</span>
          </button>{" "}
          in the list.
        </p>
      )}
    </div>
  );
}
