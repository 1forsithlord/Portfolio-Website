import { describe, expect, it } from "vitest";
import { GROWTH, MOTION, SETTLED_ROTATE, applyGrowth, easeOutClock, easeOutSpeed, growthAt } from "@/lib/galaxy/motion";

describe("rotation clock", () => {
  it("starts at the configured speed", () => {
    expect(easeOutSpeed(0)).toBeCloseTo(MOTION.startSpeed);
  });

  it("never reaches zero speed, so rotation never stops", () => {
    for (const t of [0, 1, 10, 100, 1000, 1e5]) {
      expect(easeOutSpeed(t)).toBeGreaterThan(0);
    }
    expect(easeOutSpeed(1e5)).toBeCloseTo(MOTION.cruiseSpeed);
  });

  it("clamps negative time to the start", () => {
    expect(easeOutSpeed(-5)).toBeCloseTo(MOTION.startSpeed);
    expect(easeOutClock(-5)).toBe(0);
  });

  it("has a position that starts at zero and keeps increasing", () => {
    expect(easeOutClock(0)).toBeCloseTo(0);
    expect(easeOutClock(100)).toBeGreaterThan(easeOutClock(50));
    expect(easeOutClock(1000)).toBeGreaterThan(easeOutClock(100));
  });

  it("is the integral of its speed: the numerical slope matches easeOutSpeed", () => {
    const h = 1e-4;
    for (const t of [0, 2, 7, 25]) {
      const slope = (easeOutClock(t + h) - easeOutClock(t)) / h;
      expect(slope).toBeCloseTo(easeOutSpeed(t), 3);
    }
  });

  it("exposes the settled position at the end of growth", () => {
    expect(SETTLED_ROTATE).toBeCloseTo(easeOutClock(GROWTH.durationSec));
  });
});

describe("growth", () => {
  it("runs from 0 to 1 over the configured duration", () => {
    expect(growthAt(0)).toBe(0);
    expect(growthAt(GROWTH.durationSec)).toBe(1);
  });

  it("clamps outside the duration", () => {
    expect(growthAt(-10)).toBe(0);
    expect(growthAt(1000)).toBe(1);
  });

  it("is halfway at the midpoint", () => {
    expect(growthAt(GROWTH.durationSec / 2)).toBeCloseTo(0.5);
  });

  it("starts and ends with almost no slope, so there is no snap", () => {
    const nearStart = growthAt(0.001) / 0.001;
    const nearEnd = (1 - growthAt(GROWTH.durationSec - 0.001)) / 0.001;
    expect(nearStart).toBeLessThan(1e-3);
    expect(nearEnd).toBeLessThan(1e-3);
  });

  it("never goes backwards", () => {
    let previous = -1;
    for (let t = 0; t <= GROWTH.durationSec; t += 0.25) {
      const value = growthAt(t);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("applyGrowth", () => {
  it("leaves the camera alone once growth has settled", () => {
    const cam = { open: 1, dist: 5 };
    applyGrowth(cam, 1);
    expect(cam).toEqual({ open: 1, dist: 5 });
  });

  it("opens the arms less and brings the camera in at the start", () => {
    const cam = { open: 1, dist: 5 };
    applyGrowth(cam, 0);
    expect(cam.open).toBeCloseTo(GROWTH.openStart);
    expect(cam.dist).toBeCloseTo(5 - GROWTH.distIntro);
  });
});
