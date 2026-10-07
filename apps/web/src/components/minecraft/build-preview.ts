/**
 * After a build is uploaded, its creator's browser makes the 3D preview (reading the
 * file it still has) and sends it; for a project without pictures, it also draws an
 * isometric picture and adds it to the gallery as the cover. Both are extras: if
 * either fails, the upload stands and the page says why.
 */
import { uploadFile } from "@trilleo/storage/client";
import { PREVIEWABLE_EXTENSIONS } from "../../lib/minecraft/catalog";
import { attachUpload } from "./attach";

export function isPreviewableName(name: string): boolean {
  return PREVIEWABLE_EXTENSIONS.includes(
    name.toLowerCase().split(".").pop() ?? "",
  );
}

export interface PreviewOutcome {
  preview: boolean;
  cover: boolean;
  /** Why it didn't work, for people. */
  problem: string | null;
}

export async function makeBuildPreview(
  source: File,
  fileId: string,
  options: { coverFor?: number } = {},
): Promise<PreviewOutcome> {
  const outcome: PreviewOutcome = {
    preview: false,
    cover: false,
    problem: null,
  };
  if (!isPreviewableName(source.name)) return outcome;
  try {
    const files = await import("@trilleo/mc-files");
    const model = await files.readVoxels(
      new Uint8Array(await source.arrayBuffer()),
      source.name,
    );
    const bytes = await files.encodePreview(model);
    if (bytes.length > files.MAX_PREVIEW_BYTES)
      return { ...outcome, problem: "The build is too big for a 3D preview." };
    const response = await fetch(
      `/api/minecraft/preview?file=${encodeURIComponent(fileId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: bytes as BodyInit,
      },
    );
    if (!response.ok && response.status !== 409) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return { ...outcome, problem: body.error ?? "The preview wasn’t saved." };
    }
    outcome.preview = true;

    if (options.coverFor !== undefined) {
      const [{ buildMesh }, { snapshot }] = await Promise.all([
        Promise.resolve(files),
        import("./voxel-renderer"),
      ]);
      const picture = await snapshot(buildMesh(model), model.size);
      if (picture) {
        const name = `${source.name.replace(/\.[^.]+$/, "")}-isometric.png`;
        const project = options.coverFor;
        await uploadFile(new File([picture], name, { type: "image/png" }), {
          purpose: "minecraft-media",
          onStarted: (stored) =>
            attachUpload({ project, caption: "Isometric view" }, stored.id),
        });
        outcome.cover = true;
      }
    }
    return outcome;
  } catch (error) {
    return {
      ...outcome,
      problem:
        error instanceof Error
          ? error.message
          : "The 3D preview couldn’t be made.",
    };
  }
}
