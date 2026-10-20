import { useMemo, useState } from "react";
import type { ActivityItem } from "../../content/activity";
import {
  FILTERS,
  KIND_LABEL,
  countActivity,
  filterActivity,
  formatDate,
  isExternal,
  sortNewestFirst,
  type ActivityFilter,
} from "../../lib/activity";
import "../../styles/activity.css";

interface ActivityFeedProps {
  items: readonly ActivityItem[];
}

/** Dated entries you add by hand, filterable by kind. Data comes in as a prop; the component fetches nothing. */
export function ActivityFeed({ items }: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const sorted = useMemo(() => sortNewestFirst(items), [items]);
  const visible = useMemo(() => filterActivity(sorted, filter), [sorted, filter]);

  return (
    <section className="activity" aria-label="Recent activity">
      <div className="filters" role="group" aria-label="Filter by kind">
        {FILTERS.map((option) => {
          const count = countActivity(sorted, option.id);
          const pressed = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className="chip"
              aria-pressed={pressed}
              disabled={option.id !== "all" && count === 0}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              <span className="chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="empty" role="status">
          {sorted.length === 0 ? "No entries yet." : "Nothing in this filter yet."}
        </p>
      ) : (
        <ol className="list">
          {visible.map((item) => (
            <li key={item.id} className="entry">
              <div className="meta">
                <time dateTime={item.date}>{formatDate(item.date)}</time>
                <span>{KIND_LABEL[item.kind]}</span>
              </div>
              <h3 className="title">
                {item.href ? (
                  <a
                    href={item.href}
                    target={isExternal(item.href) ? "_blank" : undefined}
                    rel={isExternal(item.href) ? "noopener noreferrer" : undefined}
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </h3>
              <p className="summary">{item.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}