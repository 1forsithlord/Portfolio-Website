import { MOTION, SETTLED_ROTATE, STILL_TWINKLE, easeOutClock } from "./motion";
import { makePlanets } from "./planets";
import { createGalaxyRenderer } from "./renderer";
import { TIERS, lowerTier, pickTier, readTierEnv } from "./tiers";
import type { TierName } from "./tiers";
import type { Camera, FrameState, GalaxyRenderer } from "./types";

/** Longest single step of the clock. A hitch or a hidden tab cannot eat the whole easing. */
const MAX_STEP_SEC = 0.25;
/** After the motion has stopped only the stars move, so draw at about 30 fps. */
const SETTLED_FRAME_MS = 30;
/** Frames ignored after a (re)start, then frames averaged to judge speed. */
const WARMUP_FRAMES = 20;
const WINDOW_FRAMES = 60;
/**
  Average frame time above this means the device is too slow: step down a tier.
  While the motion plays the target is 60 fps, so the limit is about 38 fps.
  Once settled the loop is capped near 30 fps (frames land about 33 ms apart),
  so the limit is higher.
*/
const SLOW_FRAME_MS = 26;
const SLOW_FRAME_SETTLED_MS = 40;
/** How long to wait for the browser to restore a lost context before rebuilding. */
const RECOVER_MS = 1500;
/** Radians of camera yaw per second on the motion clock. */
const DRIFT = 0.05;

export interface GalaxyOptions {
  container: HTMLElement;
  /** How many planets to draw. 0 or missing draws none. */
  planetCount?: number | undefined;
  /** Fixes the tier and turns off automatic stepping down. For testing. */
  tier?: TierName | undefined;
}

export type GalaxyRunState = "running" | "paused" | "still" | "recovering" | "off";

export interface GalaxyStatus {
  tier: TierName;
  state: GalaxyRunState;
  /** True once the eased motion has stopped. Twinkle continues. */
  settled: boolean;
  /** Seconds of visible running time since the last (re)start. */
  elapsed: number;
  /** Current position on the motion clock. */
  rotate: number;
  /** Frames drawn by the loop since start. Divide the change by the time for fps. */
  drawn: number;
}

export interface GalaxyController {
  status(): GalaxyStatus;
  /** Play the intro motion again from the start. */
  restartMotion(): void;
  destroy(): void;
}

/** Placeholder camera for the home hero. The scroll journey replaces it in a later step. */
function heroCamera(wide: boolean): Camera {
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

/**
  Runs the galaxy inside `container`: builds the renderer, drives the frame
  loop, pauses when the tab is hidden, picks and adapts the quality tier and
  recovers from a lost WebGL context.
  Returns null when WebGL is unavailable. The page then keeps its gradient.
*/
export function startGalaxy(options: GalaxyOptions): GalaxyController | null {
  const { container } = options;
  const forcedTier = options.tier;
  const planets = makePlanets(options.planetCount ?? 0);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideQuery = window.matchMedia("(min-width: 900px)");

  let tierName: TierName = forcedTier ?? pickTier(readTierEnv());
  let renderer: GalaxyRenderer | null = null;
  let state: GalaxyRunState = "off";
  let raf = 0;
  let lastNow = 0;
  let elapsed = 0;
  let destroyed = false;
  let lost = false;
  let recoverTimer = 0;
  let measured = 0;
  let measuredSum = 0;
  let seen = 0;
  let measuredSettled = false;
  let drawn = 0;

  const cam = heroCamera(wideQuery.matches);
  const frameState: FrameState = {
    tTwinkle: 0,
    tRotate: 0,
    cam,
    tint: [1, 1, 1],
    tintAmt: 0,
    count: 0,
    planets,
    pAmt: planets.length > 0 ? 1 : 0,
  };

  function resetMeter(): void {
    seen = 0;
    measured = 0;
    measuredSum = 0;
  }

  /** Draws the current state without advancing any clock. */
  function render(): void {
    if (!renderer || lost) return;
    const reduced = motionQuery.matches;
    frameState.tTwinkle = reduced ? STILL_TWINKLE : elapsed;
    frameState.tRotate = reduced ? SETTLED_ROTATE : easeOutClock(elapsed);
    cam.yaw = frameState.tRotate * DRIFT;
    renderer.draw(frameState);
  }

  function build(): boolean {
    renderer?.dispose();
    renderer = null;
    const tier = TIERS[tierName];
    const dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
    renderer = createGalaxyRenderer(container, {
      particles: tier.particles,
      stars: tier.stars,
      dpr,
      onContextLost: handleLost,
      onContextRestored: handleRestored,
    });
    if (!renderer) return false;
    frameState.count = renderer.particles;
    resetMeter();
    return true;
  }

  function goOff(): void {
    stopLoop();
    renderer?.dispose();
    renderer = null;
    state = "off";
    container.dataset.galaxy = "off";
  }

  function stopLoop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function startLoop(): void {
    if (raf || destroyed || !renderer || lost) return;
    lastNow = performance.now();
    state = "running";
    raf = requestAnimationFrame(frame);
  }

  /** Puts the loop in the right mode for the current preferences and visibility. */
  function sync(): void {
    stopLoop();
    if (destroyed || !renderer || lost) return;
    if (motionQuery.matches) {
      state = "still";
      render();
    } else if (document.hidden) {
      state = "paused";
    } else {
      startLoop();
    }
  }

  function stepDown(): void {
    const next = lowerTier(tierName);
    if (!next) return;
    tierName = next;
    if (!build()) {
      goOff();
      return;
    }
    render();
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    if (!renderer || lost) return;
    const since = Math.max(now - lastNow, 0);
    const settled = elapsed >= MOTION.durationSec;
    if (settled && since < SETTLED_FRAME_MS) return;
    lastNow = now;
    elapsed += Math.min(since / 1000, MAX_STEP_SEC);

    if (forcedTier === undefined) {
      if (settled !== measuredSettled) {
        measuredSettled = settled;
        resetMeter();
      }
      seen += 1;
      if (seen > WARMUP_FRAMES) {
        measured += 1;
        measuredSum += since;
        if (measured >= WINDOW_FRAMES) {
          const mean = measuredSum / measured;
          resetMeter();
          if (mean > (settled ? SLOW_FRAME_SETTLED_MS : SLOW_FRAME_MS)) {
            stepDown();
            return;
          }
        }
      }
    }
    drawn += 1;
    render();
  }

  function handleLost(): void {
    lost = true;
    state = "recovering";
    stopLoop();
    window.clearTimeout(recoverTimer);
    recoverTimer = window.setTimeout(recover, RECOVER_MS);
  }

  function handleRestored(): void {
    recover();
  }

  function recover(): void {
    window.clearTimeout(recoverTimer);
    if (destroyed || !lost) return;
    lost = false;
    if (!build()) {
      goOff();
      return;
    }
    render();
    sync();
  }

  const resizeObserver = new ResizeObserver(() => {
    if (renderer && !lost && renderer.resize()) render();
  });
  const onVisibility = () => sync();
  const onWide = () => {
    Object.assign(cam, heroCamera(wideQuery.matches));
    render();
  };

  if (!build()) {
    container.dataset.galaxy = "off";
    return null;
  }
  render();
  container.dataset.galaxy = "ready";
  resizeObserver.observe(container);
  document.addEventListener("visibilitychange", onVisibility);
  motionQuery.addEventListener("change", sync);
  wideQuery.addEventListener("change", onWide);
  sync();

  return {
    status() {
      return {
        tier: tierName,
        state,
        settled: elapsed >= MOTION.durationSec,
        elapsed,
        rotate: easeOutClock(elapsed),
        drawn,
      };
    },
    restartMotion() {
      elapsed = 0;
      resetMeter();
      if (!motionQuery.matches) sync();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.clearTimeout(recoverTimer);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", sync);
      wideQuery.removeEventListener("change", onWide);
      renderer?.dispose();
      renderer = null;
      delete container.dataset.galaxy;
    },
  };
}