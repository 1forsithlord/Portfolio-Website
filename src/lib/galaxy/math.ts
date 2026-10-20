import type { Camera, Planet, Vec3 } from "./types";

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Small seeded random generator (mulberry32). Same seed, same galaxy on every load. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth01 = (x: number): number => {
  const c = clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};

/** World-space position of a planet at time t. */
export const planetPos = (planet: Planet, t: number): Vec3 => {
  const a = planet.a0 - t * planet.w;
  return [Math.cos(a) * planet.R, planet.y, Math.sin(a) * planet.R];
};

/** World point to camera space. Mirrors viewSpace() in the shaders. */
export function toView(pos: Vec3, cam: Camera): Vec3 {
  const x = pos[0] - cam.tx;
  const y = pos[1] - cam.ty;
  const z = pos[2] - cam.tz;
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}
