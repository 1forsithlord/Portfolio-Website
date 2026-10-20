/*
  The motion clocks.

  Two things move on time, and they behave differently:

  1. Rotation. The clock `rotate` drives the galaxy arms, planet orbits, planet
     spin and the slow camera drift. Its speed starts at `startSpeed` and eases
     exponentially down to `cruiseSpeed`. It never reaches zero, so the galaxy
     keeps turning for as long as the page is open.

  2. Growth. A value from 0 to 1 over `GROWTH.durationSec` that sets how open
     the arms are and how far the camera has zoomed out. It eases in and out
     with zero slope at both ends, so it settles with no snap, and stays at 1
     after that.

  Star twinkle is separate again: it counts time without limit and never
  settles. See controller.ts.
*/

export interface MotionConfig {
  /** Clock speed at t = 0, as a multiple of real time. */
  startSpeed: number;
  /** Speed the clock settles to. Greater than zero, so rotation never stops. */
  cruiseSpeed: number;
  /** How fast the speed falls from startSpeed toward cruiseSpeed, per second. */
  decay: number;
}

export const MOTION: MotionConfig = {
  startSpeed: 1,
  cruiseSpeed: 0.15,
  decay: 0.25,
};

export interface GrowthConfig {
  /** Seconds over which growth eases from 0 to 1. */
  durationSec: number;
  /** Arm openness multiplier at the start. It rises to 1 as growth completes. */
  openStart: number;
  /** How much closer the camera starts, in distance units. It zooms out to the final distance. */
  distIntro: number;
}

export const GROWTH: GrowthConfig = {
  durationSec: 25,
  openStart: 0.6,
  distIntro: 1.5,
};

/** Speed of the rotation clock after `elapsed` seconds. Always above zero. */
export function easeOutSpeed(elapsed: number, cfg: MotionConfig = MOTION): number {
  const t = Math.max(elapsed, 0);
  return cfg.cruiseSpeed + (cfg.startSpeed - cfg.cruiseSpeed) * Math.exp(-cfg.decay * t);
}

/**
  Position on the rotation clock after `elapsed` seconds. This is the integral
  of easeOutSpeed, so it has a closed form and keeps increasing forever.
*/
export function easeOutClock(elapsed: number, cfg: MotionConfig = MOTION): number {
  const t = Math.max(elapsed, 0);
  const k = cfg.decay;
  return cfg.cruiseSpeed * t + ((cfg.startSpeed - cfg.cruiseSpeed) / k) * (1 - Math.exp(-k * t));
}

/** Rotation clock position at the end of growth. Used for the single still frame under reduced motion. */
export const SETTLED_ROTATE = easeOutClock(GROWTH.durationSec);

/** Twinkle time used for the single still frame under reduced motion. */
export const STILL_TWINKLE = 4;

/** 0 at the start of growth, 1 once it has settled. Smoothstep: zero slope at both ends, so no snap. */
export function growthAt(elapsed: number, cfg: GrowthConfig = GROWTH): number {
  const u = Math.min(Math.max(elapsed / cfg.durationSec, 0), 1);
  return u * u * (3 - 2 * u);
}

/**
  Applies the growth to a camera in place. At growth 1 nothing changes, so the
  settled look is exactly the one the journey and hero were designed for.
*/
export function applyGrowth(cam: { open: number; dist: number }, grown: number, cfg: GrowthConfig = GROWTH): void {
  cam.open *= cfg.openStart + (1 - cfg.openStart) * grown;
  cam.dist -= (1 - grown) * cfg.distIntro;
}