import { describe, expect, it } from "vitest";
import { activity } from "@/content/activity";
import { projects } from "@/content/projects";

describe("project content", () => {
  it("has at least one featured project", () => {
    expect(projects.some((project) => project.featured)).toBe(true);
  });

  it("uses only GitHub URLs for repos and HTTPS for demos", () => {
    for (const project of projects) {
      if (project.repoUrl !== null) expect(project.repoUrl).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
      if (project.demoUrl !== null) expect(project.demoUrl).toMatch(/^https:\/\//);
    }
  });

  it("has a non-empty stack for every project", () => {
    for (const project of projects) expect(project.stack.length).toBeGreaterThan(0);
  });
});

describe("activity content", () => {
  it("uses ISO dates for every entry", () => {
    for (const item of activity) expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("has unique ids", () => {
    const ids = activity.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
