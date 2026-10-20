import { describe, expect, it } from "vitest";
import {
  FIRST_PLANET_S,
  OPEN_S,
  OUT_PAD,
  PLANET_STEP,
  chapterVisibility,
  journeyLayout,
  nearestChapter,
  planetScroll,
} from "@/lib/journey/layout";

describe("journeyLayout", () => {
  it("has only the hero and the closing stop when there are no planets", () => {
    const layout = journeyLayout(0);
    expect(layout.planetCount).toBe(0);
    expect(layout.chapters.map((c) => c.kind)).toEqual(["hero", "out"]);
    expect(layout.sOut).toBeCloseTo(OPEN_S + OUT_PAD);
  });

  it("places one planet chapter per planet, in order", () => {
    const layout = journeyLayout(3);
    const planets = layout.chapters.filter((c) => c.kind === "planet");
    expect(planets.map((c) => c.planet)).toEqual([0, 1, 2]);
    expect(planets.map((c) => c.s)).toEqual([planetScroll(0), planetScroll(1), planetScroll(2)]);
  });

  it("ends the journey OUT_PAD after the last planet, with one extra screen of track", () => {
    const layout = journeyLayout(3);
    expect(layout.sOut).toBeCloseTo(planetScroll(2) + OUT_PAD);
    expect(layout.totalScreens).toBeCloseTo(layout.sOut + 1);
  });

  it("keeps chapters in ascending scroll order", () => {
    const layout = journeyLayout(5);
    const positions = layout.chapters.map((c) => c.s);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("treats negative or fractional planet counts safely", () => {
    expect(journeyLayout(-2).planetCount).toBe(0);
    expect(journeyLayout(2.9).planetCount).toBe(2);
  });

  it("spaces planets by PLANET_STEP after the first", () => {
    expect(planetScroll(0)).toBe(FIRST_PLANET_S);
    expect(planetScroll(2) - planetScroll(1)).toBeCloseTo(PLANET_STEP);
  });
});

describe("nearestChapter", () => {
  const layout = journeyLayout(2);

  it("returns the hero near the top", () => {
    expect(nearestChapter(layout, 0.1).kind).toBe("hero");
  });

  it("returns the right planet near its stop", () => {
    const chapter = nearestChapter(layout, planetScroll(1) - 0.05);
    expect(chapter).toMatchObject({ kind: "planet", planet: 1 });
  });

  it("returns the closing stop past the end", () => {
    expect(nearestChapter(layout, 99).kind).toBe("out");
  });
});

describe("chapterVisibility", () => {
  it("is fully visible at the stop and within 0.2 screens of it", () => {
    expect(chapterVisibility(2, 2)).toBe(1);
    expect(chapterVisibility(2.2, 2)).toBeCloseTo(1);
  });

  it("is hidden half a screen away", () => {
    expect(chapterVisibility(2.5, 2)).toBe(0);
    expect(chapterVisibility(1.5, 2)).toBe(0);
  });

  it("fades linearly in between", () => {
    expect(chapterVisibility(2.35, 2)).toBeCloseTo(0.5);
  });

  it("stays in the 0 to 1 range", () => {
    for (let s = -2; s <= 6; s += 0.05) {
      const v = chapterVisibility(s, 1.5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
