import { planetPos, toView } from "../galaxy/math";
import type { Camera, Planet } from "../galaxy/types";

/** The same constant the planet vertex shader uses. */
const FOCAL = 2.9;

export interface ScreenPoint {
  /** CSS pixels from the left edge of the viewport. */
  x: number;
  /** CSS pixels from the top edge of the viewport. */
  y: number;
  /** False when the planet is behind the camera or too close to draw. */
  visible: boolean;
}

/**
  Where a planet's centre appears on screen. It uses the same maths as the
  planet vertex shader: camera space, perspective divide, then the shift.
  The galaxy layer is the full viewport, so its aspect ratio is width / height.
*/
export function planetOnScreen(
  planet: Planet,
  t: number,
  cam: Readonly<Camera>,
  width: number,
  height: number,
): ScreenPoint {
  const view = toView(planetPos(planet, t), cam);
  const depth = cam.dist + view[2];
  if (depth < 0.25) return { x: 0, y: 0, visible: false };
  const aspect = width / Math.max(height, 1);
  const clipX = ((view[0] / depth) * FOCAL) / aspect + cam.sx;
  const clipY = (view[1] / depth) * FOCAL + cam.sy;
  return { x: ((clipX + 1) / 2) * width, y: ((1 - clipY) / 2) * height, visible: true };
}
