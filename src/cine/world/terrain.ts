/* ════════════════════════════════════════════════════════════════════
   The world: an original hillside drawn in real time with WebGL 2.

   A noise-shaped hill under soft light, grass in many greens, drifts of
   heather on its slopes, and air that fades the far ground into the sky.
   As the story moves on, the same ground becomes a map: the colours
   settle to paper and blue contour lines rise out of the terrain.

   No dependencies and no assets: the ground is a height function, built
   into one mesh; the look is one fragment shader. Everything here is pure
   and deterministic, so the scene is the same on every visit.
   ════════════════════════════════════════════════════════════════════ */

/* ── noise ─────────────────────────────────────────────────────────── */
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  const u = smooth(fx), v = smooth(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}

/** The ground's height at (x, z), in world units. The main hill sits ahead and a little right. */
export function heightAt(x: number, z: number) {
  const hill = 7.4 * Math.exp(-((x - 3) ** 2 / 150 + (z + 14) ** 2 / 70));
  const shoulder = 3.6 * Math.exp(-((x + 15) ** 2 / 90 + (z + 9) ** 2 / 46));
  const far = 4.2 * Math.exp(-((x - 22) ** 2 / 160 + (z + 30) ** 2 / 120));
  const roll = (fbm(x * 0.06 + 3.1, z * 0.06 - 1.7) - 0.5) * 3.2;
  const fine = (fbm(x * 0.32, z * 0.32, 3) - 0.5) * 0.42;
  return hill + shoulder + far + roll + fine;
}

/* ── the mesh ──────────────────────────────────────────────────────── */
export const EXTENT = { x0: -46, x1: 46, z0: -52, z1: 16 };
export function buildMesh(nx = 170, nz = 130) {
  const { x0, x1, z0, z1 } = EXTENT;
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const nor = new Float32Array(pos.length);
  const e = 0.25;
  let k = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz, y = heightAt(x, z);
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      const dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
      const l = Math.hypot(dx, 2 * e, dz);
      nor[k] = -dx / l; nor[k + 1] = (2 * e) / l; nor[k + 2] = -dz / l;
      k += 3;
    }
  }
  const idx = new Uint32Array(nx * nz * 6);
  let t = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx[t++] = a; idx[t++] = c; idx[t++] = b; idx[t++] = b; idx[t++] = c; idx[t++] = d;
  }
  return { pos, nor, idx };
}

/* ── matrices (column-major, as WebGL expects) ─────────────────────── */
export type V3 = [number, number, number];
export function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
export function lookAt(eye: V3, at: V3, up: V3 = [0, 1, 0]) {
  let zx = eye[0] - at[0], zy = eye[1] - at[1], zz = eye[2] - at[2];
  let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1]);
}
export function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
/** A world point on the screen, in CSS pixels; `vis` is false behind the camera or off the edge. */
export function project(m: Float32Array, p: V3, w: number, h: number) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const ww = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  if (ww <= 0.01) return { x: 0, y: 0, vis: false };
  const sx = (x / ww * 0.5 + 0.5) * w, sy = (1 - (y / ww * 0.5 + 0.5)) * h;
  return { x: sx, y: sy, vis: sx > -40 && sx < w + 40 && sy > -40 && sy < h + 40 };
}

/* ── shaders ───────────────────────────────────────────────────────── */
export const VERT = `#version 300 es
in vec3 aPos; in vec3 aNor;
uniform mat4 uVP;
out vec3 vPos; out vec3 vNor;
void main() { vPos = aPos; vNor = aNor; gl_Position = uVP * vec4(aPos, 1.0); }`;

export const FRAG = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNor;
uniform vec3 uCam; uniform vec3 uSky; uniform float uMap; uniform float uFog;
out vec4 outColor;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  vec3 n = normalize(vNor);
  vec3 sun = normalize(vec3(-0.42, 0.82, 0.38));
  float dif = max(dot(n, sun), 0.0);
  float rim = pow(1.0 - max(dot(n, normalize(uCam - vPos)), 0.0), 3.0);
  vec2 q = vPos.xz;
  /* grass: broad patches in three greens, clumps, then the grain of the blades */
  float patchN = fbm(q * 0.085);
  vec3 grass = mix(vec3(0.2, 0.36, 0.13), vec3(0.46, 0.61, 0.25), smoothstep(0.26, 0.76, patchN));
  grass = mix(grass, vec3(0.62, 0.69, 0.35), smoothstep(0.6, 0.92, fbm(q * 0.2 + 3.0)) * 0.5);
  float clump = fbm(q * 3.1 + 11.0);
  grass *= 0.88 + 0.2 * clump;
  float grain = vnoise(vec2(q.x * 26.0, q.y * 9.0)) * 0.55 + vnoise(vec2(q.x * 7.0 + q.y * 3.0, q.y * 48.0)) * 0.45;
  grass *= 0.86 + 0.24 * grain;
  grass *= 0.86 + 0.14 * smoothstep(-1.0, 6.0, vPos.y);
  /* heather: drifts on the slopes, a darker foliage carrying small flowers, scattered irregularly at two sizes */
  float driftN = fbm(q * 0.13 + vec2(7.0, 2.0)) + 0.18 * fbm(q * 0.9);
  float drift = smoothstep(0.52, 0.72, driftN) * smoothstep(0.0, 0.16, 1.0 - n.y + 0.07);
  float bloom = 0.0; float tone = 0.0;
  if (drift > 0.002) for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 6.0 : 15.0;
    vec2 g = q * sc + float(k) * 9.7;
    vec2 c = floor(g);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cc = c + vec2(float(i), float(j));
      vec2 o = vec2(hash(cc), hash(cc + 5.3));
      float r = 0.18 + 0.3 * hash(cc + 2.1);
      float d = length(g - cc - o);
      float b = (1.0 - smoothstep(r * 0.45, r, d)) * step(0.35, hash(cc + 8.8));
      if (b > bloom) { bloom = b; tone = hash(cc + 3.1); }
    }
  }
  vec3 foliage = vec3(0.27, 0.27, 0.17);
  vec3 flower = mix(vec3(0.8, 0.5, 0.72), vec3(0.58, 0.4, 0.7), tone);
  vec3 albedo = mix(grass, foliage, drift * 0.62);
  albedo = mix(albedo, flower, drift * bloom * 0.9);
  float ao = 0.8 + 0.2 * smoothstep(0.15, 0.8, clump);
  vec3 col = albedo * (0.3 + 0.98 * dif) * ao + vec3(0.04, 0.05, 0.08) * n.y + rim * vec3(0.12, 0.13, 0.12);
  /* the same ground as a map: paper, relief shading and blue contours */
  float hl = vPos.y * 1.15;
  float w = fwidth(hl);
  float minor = 1.0 - smoothstep(0.0, 1.3 * w, abs(fract(hl + 0.5) - 0.5));
  float major = 1.0 - smoothstep(0.0, 1.7 * w, abs(fract(hl / 5.0 + 0.5) - 0.5) * 5.0);
  vec3 paper = vec3(0.952, 0.962, 0.982) * (0.9 + 0.1 * dif);
  vec3 mapCol = mix(paper, vec3(0.141, 0.341, 0.808), minor * 0.22 + major * 0.42);
  col = mix(col, mapCol, uMap);
  /* air: the far ground fades into the sky */
  float dist = length(vPos - uCam);
  float fog = clamp((1.0 - exp(-dist * uFog)) * 1.2 - 0.12, 0.0, 1.0);
  col = mix(col, uSky, fog * (1.0 - uMap * 0.55));
  outColor = vec4(col, 1.0);
}`;
