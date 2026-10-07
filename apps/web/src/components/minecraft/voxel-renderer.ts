/**
 * A small WebGL2 renderer for build previews: one indexed mesh of flat-coloured
 * faces (shading is baked into the colours, see @trilleo/mc-files' mesh), seen
 * through an orthographic camera that starts at the isometric angle and orbits
 * around the build's centre. No library: the whole thing is a few matrices.
 */
import type { Mesh } from "@trilleo/mc-files";
import { THEME_COLORS } from "@trilleo/ui/theme";

type Mat4 = Float32Array;

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++)
        sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0);
      out[col * 4 + row] = sum;
    }
  return out;
}

function lookAt(eye: number[], target: number[], up: number[]): Mat4 {
  const sub = (p: number[], q: number[]) => p.map((v, i) => v - (q[i] ?? 0));
  const norm = (v: number[]) => {
    const length = Math.hypot(...v) || 1;
    return v.map((x) => x / length);
  };
  const cross = (p: number[], q: number[]) => [
    (p[1] ?? 0) * (q[2] ?? 0) - (p[2] ?? 0) * (q[1] ?? 0),
    (p[2] ?? 0) * (q[0] ?? 0) - (p[0] ?? 0) * (q[2] ?? 0),
    (p[0] ?? 0) * (q[1] ?? 0) - (p[1] ?? 0) * (q[0] ?? 0),
  ];
  const dot = (p: number[], q: number[]) =>
    p.reduce((sum, v, i) => sum + v * (q[i] ?? 0), 0);
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0] ?? 0,
    y[0] ?? 0,
    z[0] ?? 0,
    0,
    x[1] ?? 0,
    y[1] ?? 0,
    z[1] ?? 0,
    0,
    x[2] ?? 0,
    y[2] ?? 0,
    z[2] ?? 0,
    0,
    -dot(x, eye),
    -dot(y, eye),
    -dot(z, eye),
    1,
  ]);
}

function ortho(
  halfWidth: number,
  halfHeight: number,
  near: number,
  far: number,
): Mat4 {
  return new Float32Array([
    1 / halfWidth,
    0,
    0,
    0,
    0,
    1 / halfHeight,
    0,
    0,
    0,
    0,
    -2 / (far - near),
    0,
    0,
    0,
    -(far + near) / (far - near),
    1,
  ]);
}

const VERTEX = `#version 300 es
in vec3 position;
in vec3 colour;
uniform mat4 matrix;
out vec3 shade;
void main() {
  gl_Position = matrix * vec4(position, 1.0);
  shade = colour;
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in vec3 shade;
out vec4 colour;
void main() {
  colour = vec4(shade, 1.0);
}`;

/** The isometric view: 45° around, looking down at about 35°. */
export const ISOMETRIC = { yaw: Math.PI / 4, pitch: Math.atan(1 / Math.SQRT2) };

export class RendererError extends Error {}

export class VoxelRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffers: WebGLBuffer[] = [];
  private count = 0;
  private size: [number, number, number] = [1, 1, 1];
  private frame = 0;
  yaw = ISOMETRIC.yaw;
  pitch = ISOMETRIC.pitch;
  /** 1 fits the whole build; more is closer. */
  zoom = 1;

  constructor(
    readonly canvas: HTMLCanvasElement,
    options: { preserveDrawingBuffer?: boolean } = {},
  ) {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    });
    if (!gl)
      throw new RendererError("This browser can’t draw in 3D (no WebGL2).");
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new RendererError("Couldn’t start 3D drawing.");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new RendererError(gl.getShaderInfoLog(shader) ?? "Shader error.");
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new RendererError(gl.getProgramInfoLog(program) ?? "Link error.");
    this.program = program;
    this.vao = gl.createVertexArray();
    gl.enable(gl.DEPTH_TEST);
  }

  /** Shows a mesh of a build of `size` blocks. */
  setMesh(mesh: Mesh, size: [number, number, number]) {
    const { gl } = this;
    for (const buffer of this.buffers) gl.deleteBuffer(buffer);
    this.buffers.length = 0;
    this.size = size;
    gl.bindVertexArray(this.vao);
    const attribute = (
      name: string,
      data: Float32Array | Uint8Array,
      type: number,
      normalized: boolean,
    ) => {
      const buffer = gl.createBuffer();
      this.buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const location = gl.getAttribLocation(this.program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, type, normalized, 0, 0);
    };
    attribute("position", mesh.positions, gl.FLOAT, false);
    attribute("colour", mesh.colours, gl.UNSIGNED_BYTE, true);
    const indices = gl.createBuffer();
    this.buffers.push(indices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.count = mesh.indices.length;
    this.requestDraw();
  }

  /** Draws on the next animation frame (several changes, one draw). */
  requestDraw() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  draw() {
    const { gl, canvas } = this;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (this.count === 0) return;

    const [sx, sy, sz] = this.size;
    const centre = [sx / 2, sy / 2, sz / 2];
    const radius = Math.hypot(sx, sy, sz) / 2 || 1;
    const eye = [
      (centre[0] ?? 0) + Math.cos(this.pitch) * Math.sin(this.yaw) * radius * 3,
      (centre[1] ?? 0) + Math.sin(this.pitch) * radius * 3,
      (centre[2] ?? 0) + Math.cos(this.pitch) * Math.cos(this.yaw) * radius * 3,
    ];
    const view = lookAt(eye, centre, [0, 1, 0]);
    const half = (radius * 1.05) / this.zoom;
    const aspect = width / height;
    const projection =
      aspect >= 1
        ? ortho(half * aspect, half, radius, radius * 5)
        : ortho(half, half / aspect, radius, radius * 5);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "matrix"),
      false,
      multiply(projection, view),
    );
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  /** Turns the view (radians), keeping it between straight down and level. */
  orbit(dYaw: number, dPitch: number) {
    this.yaw += dYaw;
    this.pitch = Math.max(
      -0.2,
      Math.min(Math.PI / 2 - 0.01, this.pitch + dPitch),
    );
    this.requestDraw();
  }

  zoomBy(factor: number) {
    this.zoom = Math.max(0.5, Math.min(12, this.zoom * factor));
    this.requestDraw();
  }

  reset() {
    this.yaw = ISOMETRIC.yaw;
    this.pitch = ISOMETRIC.pitch;
    this.zoom = 1;
    this.requestDraw();
  }

  /** Drag to orbit, wheel or pinch to zoom. Returns a function that stops it. */
  attachControls(): () => void {
    const { canvas } = this;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const move = (event: PointerEvent) => {
      const last = pointers.get(event.pointerId);
      if (!last) return;
      const next = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, next);
      if (pointers.size === 1) {
        this.orbit(-(next.x - last.x) * 0.01, (next.y - last.y) * 0.01);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(
          (a?.x ?? 0) - (b?.x ?? 0),
          (a?.y ?? 0) - (b?.y ?? 0),
        );
        if (pinch) this.zoomBy(distance / pinch);
        pinch = distance;
      }
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      this.zoomBy(Math.exp(-event.deltaY * 0.0015));
    };
    const resize = new ResizeObserver(() => {
      this.requestDraw();
    });
    resize.observe(canvas);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      resize.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    for (const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }
}

/**
 * An isometric picture of a build (for an automatic cover): drawn off screen at
 * `width` × `height` on the light paper (covers look the same in either theme),
 * as a PNG.
 */
export async function snapshot(
  mesh: Mesh,
  size: [number, number, number],
  options: { width?: number; height?: number } = {},
): Promise<Blob | null> {
  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `position:fixed;left:-10000px;width:${String(width)}px;height:${String(height)}px`;
  document.body.append(canvas);
  try {
    const renderer = new VoxelRenderer(canvas, { preserveDrawingBuffer: true });
    renderer.setMesh(mesh, size);
    renderer.draw();
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const context = out.getContext("2d");
    if (!context) return null;
    context.fillStyle = THEME_COLORS.light;
    context.fillRect(0, 0, out.width, out.height);
    context.drawImage(canvas, 0, 0);
    renderer.destroy();
    return await new Promise((resolve) => {
      out.toBlob(resolve, "image/png");
    });
  } catch {
    return null;
  } finally {
    canvas.remove();
  }
}
