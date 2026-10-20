import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { getSiteStats } from "@/lib/site-stats";

describe("getSiteStats", () => {
  const stats = getSiteStats();

  it("counts projects from projects.ts", () => {
    expect(stats.projectCount).toBe(projects.length);
  });

  it("only reports a star total when at least one repo is tracked", () => {
    expect(stats.totalStars === null).toBe(stats.trackedRepos === 0);
  });

  it("never reports a negative or fractional count", () => {
    expect(Number.isInteger(stats.trackedRepos)).toBe(true);
    expect(stats.trackedRepos).toBeGreaterThanOrEqual(0);
    if (stats.totalStars !== null) expect(stats.totalStars).toBeGreaterThanOrEqual(0);
  });
});
