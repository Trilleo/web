/**
 * A build as triangles for the 3D view: one quad per face that can be seen (faces
 * between two solid blocks are skipped), each block in its flat colour, shaded by
 * which way the face points (top lightest), so no lighting is needed to draw it.
 */
import {
  blockColour,
  blockOccludes,
  blockShape,
  type BlockShape,
} from "./blocks";
import type { VoxelModel } from "./voxels";

export interface Mesh {
  /** x, y, z per vertex, in blocks (the build's corner at 0, 0, 0). */
  positions: Float32Array;
  /** r, g, b per vertex. */
  colours: Uint8Array;
  /** Three vertex indices per triangle. */
  indices: Uint32Array;
  faces: number;
}

/** Past this many faces, a build is too detailed to show. */
export const MAX_FACES = 1_500_000;

/** Brightness by face direction: top, bottom, east/west, north/south. */
const LIGHT = { up: 1, down: 0.55, x: 0.8, z: 0.66 } as const;

// Each face: its normal axis and side, its four corners (unit cube), its light.
const FACES = [
  {
    dx: 0,
    dy: 1,
    dz: 0,
    light: LIGHT.up,
    corners: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    dx: 0,
    dy: -1,
    dz: 0,
    light: LIGHT.down,
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    dx: 1,
    dy: 0,
    dz: 0,
    light: LIGHT.x,
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    dx: -1,
    dy: 0,
    dz: 0,
    light: LIGHT.x,
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    dx: 0,
    dy: 0,
    dz: 1,
    light: LIGHT.z,
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    dx: 0,
    dy: 0,
    dz: -1,
    light: LIGHT.z,
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
] as const;

/** The box each shape fills inside its block: [min x, y, z], [max x, y, z]. */
const BOXES: Readonly<
  Record<BlockShape, readonly [readonly number[], readonly number[]]>
> = {
  full: [
    [0, 0, 0],
    [1, 1, 1],
  ],
  slab: [
    [0, 0, 0],
    [1, 0.5, 1],
  ],
  flat: [
    [0, 0, 0],
    [1, 0.0625, 1],
  ],
  small: [
    [0.375, 0, 0.375],
    [0.625, 0.625, 0.625],
  ],
};

export class MeshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeshError";
  }
}

/**
 * The triangles of a build, showing only layers below `maxY` (to look inside).
 * Throws MeshError past MAX_FACES.
 */
export function buildMesh(model: VoxelModel, maxY = model.size[1]): Mesh {
  const [sx, sy, sz] = model.size;
  const top = Math.max(0, Math.min(sy, maxY));
  const occludes = model.palette.map(
    (name) => name !== "air" && blockOccludes(name),
  );
  const shapes = model.palette.map((name) => blockShape(name));
  const colours = model.palette.map((name) => blockColour(name));
  const { data } = model;
  const at = (x: number, y: number, z: number) =>
    x < 0 || y < 0 || z < 0 || x >= sx || y >= top || z >= sz
      ? 0
      : (data[x + z * sx + y * sx * sz] ?? 0);

  // First count the faces, so the arrays are allocated once.
  let faces = 0;
  for (let y = 0; y < top; y++)
    for (let z = 0; z < sz; z++)
      for (let x = 0; x < sx; x++) {
        const value = at(x, y, z);
        if (!value) continue;
        if (shapes[value] !== "full") {
          faces += 6;
          continue;
        }
        for (const face of FACES)
          if (!occludes[at(x + face.dx, y + face.dy, z + face.dz)]) faces++;
      }
  if (faces > MAX_FACES)
    throw new MeshError("This build is too detailed to show in 3D.");

  const positions = new Float32Array(faces * 4 * 3);
  const vertexColours = new Uint8Array(faces * 4 * 3);
  const indices = new Uint32Array(faces * 6);
  let quad = 0;
  for (let y = 0; y < top; y++)
    for (let z = 0; z < sz; z++)
      for (let x = 0; x < sx; x++) {
        const value = at(x, y, z);
        if (!value) continue;
        const shape = shapes[value] ?? "full";
        const [low, high] = BOXES[shape];
        const colour = colours[value] ?? 0x8c8c8c;
        for (const face of FACES) {
          if (
            shape === "full" &&
            occludes[at(x + face.dx, y + face.dy, z + face.dz)]
          )
            continue;
          const r = Math.round(((colour >> 16) & 0xff) * face.light);
          const g = Math.round(((colour >> 8) & 0xff) * face.light);
          const b = Math.round((colour & 0xff) * face.light);
          const base = quad * 4;
          face.corners.forEach((corner, i) => {
            const p = (base + i) * 3;
            positions[p] = x + ((corner[0] ? high[0] : low[0]) ?? 0);
            positions[p + 1] = y + ((corner[1] ? high[1] : low[1]) ?? 0);
            positions[p + 2] = z + ((corner[2] ? high[2] : low[2]) ?? 0);
            vertexColours[p] = r;
            vertexColours[p + 1] = g;
            vertexColours[p + 2] = b;
          });
          const t = quad * 6;
          indices[t] = base;
          indices[t + 1] = base + 1;
          indices[t + 2] = base + 2;
          indices[t + 3] = base;
          indices[t + 4] = base + 2;
          indices[t + 5] = base + 3;
          quad++;
        }
      }
  return { positions, colours: vertexColours, indices, faces };
}
