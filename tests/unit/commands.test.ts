import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { nav } from "@/content/site";
import { buildCommands, filterCommands } from "@/lib/commands";

describe("buildCommands", () => {
  const commands = buildCommands();

  it("includes one command per nav item and per project", () => {
    expect(commands.filter((c) => c.group === "Pages")).toHaveLength(nav.length);
    expect(commands.filter((c) => c.group === "Projects")).toHaveLength(projects.length);
  });

  it("gives every command a unique id", () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens external links in a new tab and internal ones in place", () => {
    for (const command of commands) {
      expect(command.external).toBe(command.href.startsWith("https://"));
    }
  });
});

describe("filterCommands", () => {
  const commands = buildCommands();

  it("returns everything for an empty or whitespace query", () => {
    expect(filterCommands(commands, "")).toHaveLength(commands.length);
    expect(filterCommands(commands, "   ")).toHaveLength(commands.length);
  });

  it("matches case-insensitively on title and tech stack", () => {
    const titles = filterCommands(commands, "LORA").map((c) => c.title);
    expect(titles).toContain("Zero-LoRA");
  });

  it("requires every word of the query to match", () => {
    const hit = filterCommands(commands, "product master").map((c) => c.title);
    expect(hit).toContain("Product-Master");
    expect(filterCommands(commands, "product xyzzy")).toHaveLength(0);
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(filterCommands(commands, "zzzqqq")).toEqual([]);
  });
});
