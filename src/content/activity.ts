export type ActivityKind = "commit" | "release" | "project" | "writing";

export interface ActivityItem {
  id: string;
  /** Date as YYYY-MM-DD. Shown exactly as written. */
  date: string;
  kind: ActivityKind;
  title: string;
  summary: string;
  /** Link to the source: a full https URL, or null for no link. */
  href: string | null;
}

/**
  Dated entries, added by hand. The page sorts them newest first.

  Nothing is shown as activity unless it is in this list. Leave it empty
  until there are real entries. Shape, for reference only (not real data):

  { id: "example-id", date: "2026-01-31", kind: "project", title: "Title", summary: "One sentence.", href: null },
*/
export const activity: readonly ActivityItem[] = [];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const seen = new Set<string>();
for (const item of activity) {
  if (!ISO_DATE.test(item.date) || Number.isNaN(Date.parse(item.date))) {
    throw new Error(`Activity ${item.id}: date must be YYYY-MM-DD`);
  }
  if (seen.has(item.id)) {
    throw new Error(`Duplicate activity id: ${item.id}`);
  }
  seen.add(item.id);
}