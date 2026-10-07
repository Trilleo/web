/**
 * A build's 3D view on its page. Until asked, it's a box saying how big the build
 * is; "View in 3D" loads the preview and the renderer (only then: they're the heavy
 * part), and shows the build to turn, zoom and cut through layer by layer. The
 * materials list beside it (server-rendered) is the same information as text.
 */
import { ArrowLeftIcon, ArrowRightIcon, Button } from "@trilleo/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Mesh, VoxelModel } from "@trilleo/mc-files";
import type { VoxelRenderer } from "./voxel-renderer";

export interface BuildViewerProps {
  previewUrl: string;
  size: [number, number, number];
  blocks: number;
  name: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "failed"; message: string };

const small =
  "type-label inline-flex h-9 min-w-9 items-center justify-center border border-ink px-2.5 text-ink hover:bg-ink hover:text-paper";

export default function BuildViewer({
  previewUrl,
  size,
  blocks,
  name,
}: BuildViewerProps) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [layers, setLayers] = useState(size[1]);
  const renderer = useRef<VoxelRenderer | null>(null);
  const model = useRef<VoxelModel | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const mesh = useRef<Mesh | null>(null);
  const makeRenderer = useRef<
    ((canvas: HTMLCanvasElement) => VoxelRenderer) | null
  >(null);

  const load = async () => {
    setState({ kind: "loading" });
    try {
      const [files, view] = await Promise.all([
        import("@trilleo/mc-files"),
        import("./voxel-renderer"),
      ]);
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error("The preview couldn’t be loaded.");
      model.current = await files.decodePreview(
        new Uint8Array(await response.arrayBuffer()),
      );
      // Meshing can fail (too detailed): find out before showing the canvas.
      mesh.current = files.buildMesh(model.current);
      makeRenderer.current = (canvas) => new view.VoxelRenderer(canvas);
      setState({ kind: "ready" });
    } catch (error) {
      setState({
        kind: "failed",
        message:
          error instanceof Error
            ? error.message
            : "The 3D view couldn’t start.",
      });
    }
  };

  // The canvas mounts once "ready" renders: start drawing then (a callback ref,
  // so a failure can show at once), and stop when it goes.
  const startDrawing = useCallback((canvas: HTMLCanvasElement | null) => {
    const current = model.current;
    if (!canvas || !current || !mesh.current) return;
    try {
      const instance = makeRenderer.current?.(canvas);
      if (!instance) return;
      instance.setMesh(mesh.current, current.size);
      stop.current = instance.attachControls();
      renderer.current = instance;
    } catch (error) {
      setState({
        kind: "failed",
        message:
          error instanceof Error
            ? error.message
            : "The 3D view couldn’t start.",
      });
    }
    return () => {
      stop.current?.();
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);

  // Cutting through: rebuild the mesh with the layers above the cut left out.
  useEffect(() => {
    if (state.kind !== "ready" || !model.current) return;
    const timer = setTimeout(() => {
      void import("@trilleo/mc-files").then(({ buildMesh }) => {
        const current = model.current;
        if (!current || !renderer.current) return;
        renderer.current.setMesh(buildMesh(current, layers), current.size);
      });
    }, 60);
    return () => {
      clearTimeout(timer);
    };
  }, [layers, state.kind]);

  const [w, h, l] = size;
  const dims = `${String(w)} × ${String(h)} × ${String(l)}`;

  return (
    <section
      aria-label={`3D view of ${name}`}
      className="flex flex-col gap-3"
      data-build-viewer
    >
      <div className="relative aspect-video w-full overflow-hidden border border-ink bg-chip">
        {state.kind === "ready" ? (
          <canvas
            ref={startDrawing}
            className="size-full cursor-grab touch-none active:cursor-grabbing"
            role="img"
            aria-label={`${name}, ${dims} blocks, drawn in 3D. The materials list has the same blocks as text.`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="type-title">{dims}</p>
            <p className="type-label text-muted">
              Blocks wide, high and long · {blocks.toLocaleString("en")} placed
            </p>
            {state.kind === "failed" ? (
              <p
                role="alert"
                className="max-w-sm border-l-2 border-accent pl-3 text-left"
              >
                {state.message}
              </p>
            ) : (
              <Button
                onClick={() => {
                  void load();
                }}
                disabled={state.kind === "loading"}
              >
                {state.kind === "loading" ? "Loading…" : "View in 3D"}
              </Button>
            )}
          </div>
        )}
      </div>
      {state.kind === "ready" && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex min-w-48 flex-1 items-center gap-3">
            <span className="shrink-0 type-label">Layers 1–{layers}</span>
            <input
              type="range"
              min={1}
              max={h}
              value={layers}
              onChange={(event) => {
                setLayers(Number(event.target.value));
              }}
              className="w-full accent-accent"
            />
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={small}
              aria-label="Turn left"
              onClick={() => renderer.current?.orbit(Math.PI / 8, 0)}
            >
              <ArrowLeftIcon size={16} />
            </button>
            <button
              type="button"
              className={small}
              aria-label="Turn right"
              onClick={() => renderer.current?.orbit(-Math.PI / 8, 0)}
            >
              <ArrowRightIcon size={16} />
            </button>
            <button
              type="button"
              className={small}
              aria-label="Zoom in"
              onClick={() => renderer.current?.zoomBy(1.25)}
            >
              +
            </button>
            <button
              type="button"
              className={small}
              aria-label="Zoom out"
              onClick={() => renderer.current?.zoomBy(0.8)}
            >
              -
            </button>
            <button
              type="button"
              className={small}
              onClick={() => {
                renderer.current?.reset();
                setLayers(h);
              }}
            >
              Reset
            </button>
          </div>
          <p className="w-full type-label text-muted">
            Drag to turn, scroll or pinch to zoom.
          </p>
        </div>
      )}
    </section>
  );
}
