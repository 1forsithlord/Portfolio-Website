import { describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { nav, site } from "@/content/site";
import { runCommand } from "@/lib/terminal";

const home = { pathname: "/" };
const projectsPage = { pathname: "/projects/" };

describe("runCommand", () => {
  it("does nothing for empty input", () => {
    expect(runCommand("   ", home)).toEqual({ lines: [] });
  });

  it("is case-insensitive for command names", () => {
    expect(runCommand("HELP", home).lines[0]?.text).toMatch(/^help/);
  });

  it("prints the site's own name, role and tagline for whoami", () => {
    const text = runCommand("whoami", home)
      .lines.map((line) => line.text)
      .join("\n");
    expect(text).toContain(site.name);
    expect(text).toContain(site.role);
    expect(text).toContain(site.tagline);
  });

  it("lists every project once in ls", () => {
    const lines = runCommand("ls", home).lines;
    expect(lines).toHaveLength(projects.length);
    expect(lines.every((line) => line.kind === "output")).toBe(true);
  });

  it("lists unique, sorted skills drawn from project stacks", () => {
    const [line] = runCommand("skills", home).lines;
    const listed = (line?.text ?? "").split(", ");
    const expected = [...new Set(projects.flatMap((project) => project.stack))].sort();
    expect(listed).toEqual(expected);
  });

  it("opens a project by slug and by title, ignoring case", () => {
    const bySlug = runCommand("open product-master", home);
    expect(bySlug.action).toEqual({ type: "navigate", href: "/projects/product-master" });
    const byTitle = runCommand("open PRODUCT-MASTER", home);
    expect(byTitle.action).toEqual({ type: "navigate", href: "/projects/product-master" });
  });

  it("reports an unknown project without navigating", () => {
    const result = runCommand("open nope", home);
    expect(result.action).toBeUndefined();
    expect(result.lines[0]?.kind).toBe("error");
  });

  it("asks for a project name when open has none", () => {
    const result = runCommand("open", home);
    expect(result.action).toBeUndefined();
    expect(result.lines[0]?.kind).toBe("error");
  });

  it("goes to a page by its label, using the site's own nav href", () => {
    const projectsItem = nav.find((item) => item.label === "Projects");
    expect(projectsItem).toBeDefined();
    expect(runCommand("goto projects", home).action).toEqual({ type: "navigate", href: projectsItem?.href });
  });

  it("reports an unknown page without navigating", () => {
    const result = runCommand("goto mars", home);
    expect(result.action).toBeUndefined();
    expect(result.lines[0]?.kind).toBe("error");
  });

  it("resets the galaxy only on the home page", () => {
    expect(runCommand("galaxy reset", home).action).toEqual({ type: "galaxy-reset" });
    const elsewhere = runCommand("galaxy reset", projectsPage);
    expect(elsewhere.action).toBeUndefined();
    expect(elsewhere.lines[0]?.kind).toBe("output");
  });

  it("requires the exact subcommand for git and galaxy", () => {
    expect(runCommand("git status", home).lines[0]?.kind).toBe("error");
    expect(runCommand("git log", home).lines[0]?.kind).toBe("output");
    expect(runCommand("galaxy stop", home).lines[0]?.kind).toBe("error");
  });

  it("says plainly that live commits are not connected", () => {
    const text = runCommand("git log", home)
      .lines.map((line) => line.text)
      .join("\n");
    expect(text).toContain("Live GitHub commits are not connected yet.");
  });

  it("returns a clear action for clear", () => {
    expect(runCommand("clear", home)).toEqual({ lines: [], action: { type: "clear" } });
  });

  it("reports unknown commands as errors", () => {
    const result = runCommand("rm -rf", home);
    expect(result.lines).toEqual([{ kind: "error", text: "command not found: rm. Type help." }]);
  });
});
