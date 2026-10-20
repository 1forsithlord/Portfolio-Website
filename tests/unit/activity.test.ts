import { describe, expect, it } from "vitest";
import type { ActivityItem } from "@/content/activity";
import { FILTERS, countActivity, filterActivity, formatDate, isExternal, sortNewestFirst } from "@/lib/activity";

const items: ActivityItem[] = [
  { id: "b", date: "2026-03-05", kind: "commit", title: "B", summary: "", href: "/a" },
  { id: "a", date: "2026-03-05", kind: "release", title: "A", summary: "", href: "/a" },
  { id: "c", date: "2026-01-20", kind: "commit", title: "C", summary: "", href: "/a" },
];

describe("formatDate", () => {
  it("formats ISO dates as day, month, year in English", () => {
    expect(formatDate("2026-03-05")).toBe("5 Mar 2026");
    expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
  });
});

describe("sortNewestFirst", () => {
  it("sorts by date descending, then by id, without changing the input", () => {
    const before = items.map((i) => i.id);
    const sorted = sortNewestFirst(items).map((i) => i.id);
    expect(sorted).toEqual(["a", "b", "c"]);
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe("filterActivity and countActivity", () => {
  it("returns everything for 'all'", () => {
    expect(filterActivity(items, "all")).toHaveLength(items.length);
  });

  it("keeps only the chosen kind", () => {
    expect(filterActivity(items, "commit").map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("counts match the filtered list", () => {
    for (const { id } of FILTERS) {
      expect(countActivity(items, id)).toBe(filterActivity(items, id).length);
    }
  });

  it("returns an empty list for an empty feed", () => {
    expect(countActivity([], "all")).toBe(0);
  });
});

describe("isExternal", () => {
  it("is true only for http and https links", () => {
    expect(isExternal("https://github.com/x")).toBe(true);
    expect(isExternal("http://example.com")).toBe(true);
    expect(isExternal("/projects")).toBe(false);
    expect(isExternal("mailto:hello@example.com")).toBe(false);
  });
});
