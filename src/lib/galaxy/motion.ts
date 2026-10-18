/*
  The eased motion clock.

  Autonomous motion (galaxy arms, planet orbits, planet spin, camera drift)
  starts fast and slows down exponentially, then stops for good once
  `durationSec` has passed. Star twinkle does not use this clock.

  Speed at time e is startSpeed * exp(-k * e), where k = decay / durationSec.
  With decay 5 the speed at the end is e^-5, which is 0.67 percent of the
  starting speed, so freezing the clock there is invisible.
*/

export interface MotionConfig {
  /** Seconds of visible time until the motion stops. */
  durationSec: number;
  /** Speed at the start, as a multiple of real time. */
  startSpeed: number;
  /** How hard the speed falls: speed at the end is exp(-decay) of the start. */
  decay: number;
}

export const MOTION: MotionConfig = {
  durationSec: 8,
  startSpeed: 3,
  decay: 5,
};

/** Position on the motion clock after `elapsed` seconds of visible time. */
export function easeOutClock(elapsed: number, cfg: MotionConfig = MOTION): number {
  const e = Math.min(Math.max(elapsed, 0), cfg.durationSec);
  const k = cfg.decay / cfg.durationSec;
  return (cfg.startSpeed / k) * (1 - Math.exp(-k * e));
}

/** Speed of the motion clock after `elapsed` seconds. Zero once it has stopped. */
export function easeOutSpeed(elapsed: number, cfg: MotionConfig = MOTION): number {
  if (elapsed >= cfg.durationSec) return 0;
  const k = cfg.decay / cfg.durationSec;
  return cfg.startSpeed * Math.exp(-k * Math.max(elapsed, 0));
}

/** Where the motion clock ends up. Used for the single still frame under reduced motion. */
export const SETTLED_ROTATE = easeOutClock(MOTION.durationSec);

/** Twinkle time used for the single still frame under reduced motion. */
export const STILL_TWINKLE = 4;