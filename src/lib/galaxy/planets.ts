import type { Planet, PlanetPalette } from "./types";

/*
  Planet colours as linear RGB triples (0 to 1), because they go straight to
  the GPU as uniforms. They are art data for WebGL, not CSS colours.
  Order: coral gas giant, violet storm, lagoon (ringed), orchid bands,
  apricot rock (ringed), mint swirl.
*/
export const PLANET_PALETTES: readonly PlanetPalette[] = [
  { rgbA: [1.0, 0.7098, 0.6196], rgbB: [1.0, 0.4353, 0.6118], rgbAtmo: [1.0, 0.8235, 0.7608], style: 0, ring: false },
  { rgbA: [0.7255, 0.6588, 1.0], rgbB: [0.3725, 0.2941, 1.0], rgbAtmo: [0.8118, 0.7686, 1.0], style: 1, ring: false },
  { rgbA: [0.5608, 0.9412, 0.902], rgbB: [0.1216, 0.6549, 0.749], rgbAtmo: [0.7686, 0.9843, 0.9608], style: 2, ring: true },
  { rgbA: [1.0, 0.6235, 0.8392], rgbB: [0.651, 0.2471, 0.8157], rgbAtmo: [1.0, 0.7843, 0.9176], style: 0, ring: false },
  { rgbA: [1.0, 0.851, 0.6275], rgbB: [1.0, 0.5765, 0.3608], rgbAtmo: [1.0, 0.9137, 0.7882], style: 3, ring: true },
  { rgbA: [0.7412, 0.9686, 0.8118], rgbB: [0.2471, 0.749, 0.5804], rgbAtmo: [0.8627, 1.0, 0.9098], style: 1, ring: false },
];

/** Builds the orbit parameters for planet number `index`. */
export function makePlanet(index: number): Planet {
  const palette = PLANET_PALETTES[index % PLANET_PALETTES.length] as PlanetPalette;
  const R = 0.46 + index * 0.16 + ((index * 7) % 3) * 0.03;
  return {
    index,
    palette,
    R,
    a0: 0.7 + index * 2.399963, // golden angle keeps neighbours apart
    w: 0.14 / (0.35 + R),
    size: 0.17 + ((index * 5) % 4) * 0.018,
    y: (((index * 3) % 5) - 2) * 0.012,
    seed: 1.7 + index * 6.13,
    ringRot: -0.35 + index * 0.5,
    ring: palette.ring,
  };
}

export function makePlanets(count: number): Planet[] {
  return Array.from({ length: count }, (_, i) => makePlanet(i));
}