/*
  The eased motion clock.
*/

export interface MotionConfig {
  durationSec: number;
  startSpeed: number;
  decay: number;
}

export const MOTION: MotionConfig = {
  durationSec: 25, // 25 seconds of growth
  startSpeed: 1,   // Normal speed
  decay: 1.2,      // Very gentle decay, so it keeps moving the whole 25s
};

export function easeOutClock(elapsed: number, cfg: MotionConfig = MOTION): number {
  const e = Math.min(Math.max(elapsed, 0), cfg.durationSec);
  const k = cfg.decay / cfg.durationSec;
  return (cfg.startSpeed / k) * (1 - Math.exp(-k * e));
}

export function easeOutSpeed(elapsed: number, cfg: MotionConfig = MOTION): number {
  if (elapsed >= cfg.durationSec) return 0;
  const k = cfg.decay / cfg.durationSec;
  return cfg.startSpeed * Math.exp(-k * Math.max(elapsed, 0));
}

export const SETTLED_ROTATE = easeOutClock(MOTION.durationSec);
export const STILL_TWINKLE = 4;