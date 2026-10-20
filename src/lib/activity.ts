import type { ActivityItem, ActivityKind } from "../content/activity";

export type ActivityFilter = ActivityKind | "all";

export const FILTERS: readonly { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "commit", label: "Commits" },
  { id: "release", label: "Releases" },
  { id: "project", label: "Projects" },
  { id: "writing", label: "Writing" },
];

export const KIND_LABEL: Record<ActivityKind, string> = {
  commit: "Commit",
  release: "Release",
  project: "Project",
  writing: "Writing",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed English format, so the server and the browser render the same text. */
export function formatDate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1] ?? ""} ${year}`;
}

/** Newest first. Equal dates keep a stable order by id. */
export function sortNewestFirst(items: readonly ActivityItem[]): ActivityItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function filterActivity(items: readonly ActivityItem[], filter: ActivityFilter): ActivityItem[] {
  return filter === "all" ? [...items] : items.filter((item) => item.kind === filter);
}

export function countActivity(items: readonly ActivityItem[], filter: ActivityFilter): number {
  return filterActivity(items, filter).length;
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}