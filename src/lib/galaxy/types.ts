/** Linear RGB, each channel 0 to 1. */
export type Vec3 = readonly [number, number, number];

/** Camera state for one frame. Aspect ratio is taken from the canvas by the renderer. */
export interface Camera {
  yaw: number;
  pitch: number;
  /** Distance from the camera to the target. */
  dist: number;
  /** Screen-space shift, in clip units. */
  sx: number;
  sy: number;
  /** World-space point the camera looks at. */
  tx: number;
  ty: number;
  tz: number;
  /** 0 to 1: how far the galaxy arms have opened up. */
  open: number;
  /** 0 to 1: star brightness. */
  stars: number;
}

export interface PlanetPalette {
  rgbA: Vec3;
  rgbB: Vec3;
  rgbAtmo: Vec3;
  /** 0 banded, 1 storm, 2 stripes, 3 rock. */
  style: 0 | 1 | 2 | 3;
  ring: boolean;
}

export interface Planet {
  index: number;
  palette: PlanetPalette;
  /** Orbit radius. */
  R: number;
  /** Starting angle. */
  a0: number;
  /** Angular speed. */
  w: number;
  size: number;
  /** Height above the galactic plane. */
  y: number;
  seed: number;
  ringRot: number;
  ring: boolean;
}

export interface FrameState {
  /** Seconds. Star twinkle only. Keeps counting for as long as the page is open. */
  tTwinkle: number;
  /** Seconds on the eased motion clock. Galaxy arms, planet orbits, planet spin and camera drift all follow it. */
  tRotate: number;
  cam: Camera;
  /** Tint colour and how strongly it is mixed in (0 to 1). */
  tint: Vec3;
  tintAmt: number;
  /** How many galaxy particles to draw (capped at the renderer's budget). */
  count: number;
  planets: readonly Planet[];
  /** 0 to 1: planet visibility. */
  pAmt: number;
}

export interface RendererOptions {
  /** Galaxy particle budget. */
  particles: number;
  /** Background star budget. */
  stars: number;
  /** Device pixel ratio the canvas is rendered at. The caller decides the cap. */
  dpr: number;
  /** Called when the browser drops the WebGL context. */
  onContextLost?: (() => void) | undefined;
  /** Called when the browser offers the context back. The renderer cannot reuse it: build a new one. */
  onContextRestored?: (() => void) | undefined;
}

export interface GalaxyRenderer {
  /** Particle budget this renderer was built with. */
  readonly particles: number;
  /** True after the browser dropped the WebGL context. draw() does nothing then. */
  readonly contextLost: boolean;
  /** Match the canvas to its container. Returns false when the container has no size. */
  resize(): boolean;
  draw(state: FrameState): void;
  /** Free GPU resources and remove the canvas. */
  dispose(): void;
}
