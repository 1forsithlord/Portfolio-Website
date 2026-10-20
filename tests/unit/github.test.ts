import { beforeEach, describe, expect, it, vi } from "vitest";

const valid = {
  fullName: "1forsithlord/Product-Master",
  htmlUrl: "https://github.com/1forsithlord/Product-Master",
  description: null,
  language: "PHP",
  stars: 7,
  pushedAt: "2026-09-01T10:00:00Z",
  archived: false,
  fork: false,
  fetchedAt: "2026-10-20T00:00:00.000Z",
};

// A broken entry: stars is a string, so the whole record must be dropped, not shown.
const broken = { ...valid, fullName: "1forsithlord/bad", stars: "seven" };

vi.mock("@/content/github.generated.json", () => ({
  default: {
    fetchedAt: "2026-10-20T00:00:00.000Z",
    profile: { publicRepos: 9, fetchedAt: "2026-10-20T00:00:00.000Z" },
    repos: {
      "1forsithlord/product-master": valid,
      "1forsithlord/bad": broken,
    },
  },
}));

describe("github snapshot access", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("finds a repo by URL regardless of case", async () => {
    const { getRepoStats } = await import("@/lib/github");
    expect(getRepoStats("https://github.com/1forsithlord/Product-Master")).toEqual(valid);
    expect(getRepoStats("https://GITHUB.com/1forsithlord/product-master")).toEqual(valid);
  });

  it("returns null when there is no repo", async () => {
    const { getRepoStats } = await import("@/lib/github");
    expect(getRepoStats(null)).toBeNull();
  });

  it("returns null for a non-GitHub or malformed URL", async () => {
    const { getRepoStats } = await import("@/lib/github");
    expect(getRepoStats("https://example.com/1forsithlord/product-master")).toBeNull();
    expect(getRepoStats("https://github.com/only-owner")).toBeNull();
  });

  it("drops entries that do not match the shape instead of rendering them", async () => {
    const { getRepoStats, getTrackedRepos } = await import("@/lib/github");
    expect(getRepoStats("https://github.com/1forsithlord/bad")).toBeNull();
    expect(getTrackedRepos()).toEqual([valid]);
  });

  it("reports the public repo count from the profile", async () => {
    const { getPublicRepoCount } = await import("@/lib/github");
    expect(getPublicRepoCount()).toBe(9);
  });
});
