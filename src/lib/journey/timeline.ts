import { clamp, planetPos, smooth01 } from "../galaxy/math";
import type { Camera, Planet } from "../galaxy/types";
import { INTRO_S, planetScroll } from "./layout";
import type { JourneyLayout } from "./layout";

/**
  Camera for the home hero before any scrolling. Also the first keyframe.
  Wide screens put the galaxy to the right of the text. Narrow screens put it
  below the text and the page dims it, so the text stays readable.
*/
export function heroCamera(wide: boolean): Camera {
  return {
    yaw: 0,
    pitch: 1.05,
    dist: 7.5,
    sx: wide ? 0.55 : 0,
    sy: wide ? 0 : -0.75,
    tx: 0,
    ty: 0,
    tz: 0,
    open: 0.5,
    stars: 0.18,
  };
}

export interface Keyframe {
  /** Scroll position in screens. */
  s: number;
  dist: number;
  pitch: number;
  yaw: number;
  open: number;
  stars: number;
  sx: number;
  sy: number;
  /** Planet to look at. A fraction blends between two planets. null looks at the centre. */
  focus: number | null;
  /** Extra distance added mid-way to the next keyframe, so the camera pulls back while it travels. */
  arc: number;
}

/** Half-width of the stop at a chapter, in screens. */
const HOLD = 0.2;

export function buildTimeline(layout: JourneyLayout, wide: boolean): readonly Keyframe[] {
  const hero = heroCamera(wide);
  const syCard = wide ? 0 : 0.27;
  const frames: Keyframe[] = [];
  const add = (frame: Omit<Keyframe, "arc" | "focus"> & Partial<Pick<Keyframe, "arc" | "focus">>) => {
    frames.push({ arc: 0, focus: null, ...frame });
  };

  add({ s: 0, dist: hero.dist, pitch: hero.pitch, yaw: hero.yaw, open: hero.open, stars: hero.stars, sx: hero.sx, sy: hero.sy });
  add({ s: 0.9, dist: 5.6, pitch: 0.85, yaw: 0.35, open: 0.92, stars: 0.7, sx: wide ? 0.38 : 0, sy: syCard });
  add({ s: INTRO_S - HOLD, dist: 4.5, pitch: 0.6, yaw: 0.8, open: 1, stars: 0.95, sx: wide ? 0.44 : 0, sy: syCard });
  add({ s: INTRO_S + HOLD, dist: 4.5, pitch: 0.6, yaw: 0.8, open: 1, stars: 0.95, sx: wide ? 0.44 : 0, sy: syCard, arc: 0.9 });

  const count = layout.planetCount;
  for (let i = 0; i < count; i += 1) {
    const view = {
      dist: 1.35,
      pitch: 0.45 + 0.08 * (i % 2),
      yaw: 0.9 + i * 0.9,
      open: 1,
      stars: 1,
      sx: wide ? (i % 2 === 0 ? 0.36 : -0.36) : 0,
      sy: wide ? 0 : 0.3,
      focus: i,
    };
    add({ s: planetScroll(i) - HOLD, ...view });
    add({ s: planetScroll(i) + HOLD, ...view, arc: 1.3 });
  }

  const endYaw = 0.9 + count * 0.9;
  add({ s: layout.sOut - 0.2, dist: 6.3, pitch: 1.1, yaw: endYaw, open: 1, stars: 1, sx: 0, sy: 0 });
  add({ s: layout.sOut + 4, dist: 6.3, pitch: 1.1, yaw: endYaw, open: 1, stars: 1, sx: 0, sy: 0 });
  return frames;
}

/** Where the camera looks when focused on planet `focus` (a fraction blends two planets). */
function focusPoint(focus: number | null, planets: readonly Planet[], t: number): readonly [number, number, number] {
  if (focus === null || planets.length === 0) return [0, 0, 0];
  const last = planets.length - 1;
  const lo = planets[clamp(Math.floor(focus), 0, last)] as Planet;
  const hi = planets[clamp(Math.ceil(focus), 0, last)] as Planet;
  const a = planetPos(lo, t);
  const b = planetPos(hi, t);
  const u = focus - Math.floor(focus);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/**
  Camera at scroll position s. `t` is the motion clock, so a camera that is
  focused on a planet follows it while it still orbits.
*/
export function cameraAt(
  timeline: readonly Keyframe[],
  s: number,
  planets: readonly Planet[],
  t: number,
): Camera {
  let j = 0;
  while (j < timeline.length - 2 && s >= (timeline[j + 1] as Keyframe).s) j += 1;
  const a = timeline[j] as Keyframe;
  const b = timeline[j + 1] as Keyframe;
  const u = clamp((s - a.s) / (b.s - a.s), 0, 1);
  const e = u * u * (3 - 2 * u);
  const mix = (x: number, y: number) => x + (y - x) * e;
  const pa = focusPoint(a.focus, planets, t);
  const pb = focusPoint(b.focus, planets, t);
  return {
    dist: mix(a.dist, b.dist) + a.arc * Math.sin(Math.PI * u),
    pitch: mix(a.pitch, b.pitch),
    yaw: mix(a.yaw, b.yaw),
    open: mix(a.open, b.open),
    stars: mix(a.stars, b.stars),
    sx: mix(a.sx, b.sx),
    sy: mix(a.sy, b.sy),
    tx: mix(pa[0], pb[0]),
    ty: mix(pa[1], pb[1]),
    tz: mix(pa[2], pb[2]),
  };
}

/** 0 to 1: how visible the planets are. They appear as the camera flies in. */
export const planetAmount = (s: number): number => smooth01((s - 0.55) / 0.7);