import { projects } from "../content/projects";
import { nav, site } from "../content/site";

export type CommandGroup = "Pages" | "Projects" | "Links";

export interface Command {
  id: string;
  title: string;
  group: CommandGroup;
  href: string;
  /** External links open in a new tab. */
  external: boolean;
  /** Extra words that help a search match. They are not shown. */
  keywords: string;
}

/** Everything the palette can jump to. Built from the same content the pages use. */
export function buildCommands(): Command[] {
  const pages: Command[] = nav.map((item) => ({
    id: `page:${item.href}`,
    title: item.label,
    group: "Pages",
    href: item.href,
    external: false,
    keywords: item.href === "/" ? "home start" : item.label.toLowerCase(),
  }));

  const projectCommands: Command[] = projects.map((project) => ({
    id: `project:${project.slug}`,
    title: project.title,
    group: "Projects",
    href: `/projects/${project.slug}`,
    external: false,
    keywords: [...project.stack, project.summary].join(" "),
  }));

  const links: Command[] = [
    {
      id: "link:github",
      title: "GitHub profile",
      group: "Links",
      href: site.githubUrl,
      external: true,
      keywords: "code repositories source",
    },
  ];

  return [...pages, ...projectCommands, ...links];
}

/** Every word in the query must appear somewhere in the command. Case is ignored. */
export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...commands];
  return commands.filter((command) => {
    const haystack = `${command.title} ${command.group} ${command.keywords}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
