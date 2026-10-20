import { projects } from "../content/projects";
import { nav, site } from "../content/site";

export type LineKind = "input" | "output" | "error";

export interface Line {
  kind: LineKind;
  text: string;
}

/** Something the terminal asks the page to do after printing its lines. */
export type Action =
  | { type: "navigate"; href: string }
  | { type: "galaxy-reset" }
  | { type: "clear" };

export interface CommandResult {
  lines: Line[];
  action?: Action;
}

export interface CommandContext {
  /** Current page path, used to decide whether the galaxy is on screen. */
  pathname: string;
}

const output = (text: string): Line[] => text.split("\n").map((line) => ({ kind: "output", text: line }));
const error = (text: string): Line[] => [{ kind: "error", text }];

const HELP = [
  "help               list commands",
  "whoami             who I am",
  "ls                 list projects",
  "open <project>     open a project's case study",
  "skills             technologies used across the projects",
  "git log            projects in content order",
  "goto <page>        go to home, projects, about or contact",
  "galaxy reset       grow the galaxy again (home page)",
  "clear              clear the screen",
].join("\n");

function findProject(query: string) {
  const q = query.toLowerCase();
  return projects.find((project) => project.slug === q || project.title.toLowerCase() === q);
}

function findPage(query: string) {
  const q = query.toLowerCase();
  return nav.find((item) => item.label.toLowerCase() === q || item.href === q || item.href === `/${q}`);
}

/**
  Runs one terminal command. Pure: it reads content and returns lines and an
  optional action. The component decides how to carry the action out.
  Only facts from the site's own content are printed. Nothing is invented.
*/
export function runCommand(raw: string, ctx: CommandContext): CommandResult {
  const input = raw.trim();
  const [name = "", ...args] = input.split(/\s+/);
  const rest = args.join(" ");

  switch (name.toLowerCase()) {
    case "":
      return { lines: [] };

    case "help":
      return { lines: output(HELP) };

    case "whoami":
      return { lines: output(`${site.name}\n${site.role}\n${site.tagline}`) };

    case "ls":
      return { lines: output(projects.map((project) => `${project.slug.padEnd(22)}${project.title}`).join("\n")) };

    case "skills": {
      const all = [...new Set(projects.flatMap((project) => project.stack))].sort();
      return { lines: output(all.join(", ")) };
    }

    case "git": {
      if (args[0] !== "log") return { lines: error("usage: git log") };
      const entries = projects.map(
        (project, i) => `${String(i + 1).padStart(2, "0")}  ${project.title}\n    ${project.summary}`,
      );
      return {
        lines: output(`Projects in content order. Live GitHub commits are not connected yet.\n\n${entries.join("\n\n")}`),
      };
    }

    case "open": {
      if (!rest) return { lines: error("usage: open <project>. Try ls.") };
      const project = findProject(rest);
      if (!project) return { lines: error(`no project called "${rest}". Try ls.`) };
      return {
        lines: output(`opening ${project.title}…`),
        action: { type: "navigate", href: `/projects/${project.slug}` },
      };
    }

    case "goto": {
      if (!rest) return { lines: error("usage: goto <page>. Pages: home, projects, about, contact.") };
      const page = findPage(rest);
      if (!page) return { lines: error(`no page called "${rest}". Pages: home, projects, about, contact.`) };
      return { lines: output(`going to ${page.label}…`), action: { type: "navigate", href: page.href } };
    }

    case "galaxy": {
      if (args[0] !== "reset") return { lines: error("usage: galaxy reset") };
      const onHome = ctx.pathname.replace(/\/+$/, "") === "";
      if (!onHome) return { lines: output("the galaxy runs on the home page. Type goto home to see it.") };
      return { lines: output("growing the galaxy again…"), action: { type: "galaxy-reset" } };
    }

    case "clear":
      return { lines: [], action: { type: "clear" } };

    default:
      return { lines: error(`command not found: ${name}. Type help.`) };
  }
}