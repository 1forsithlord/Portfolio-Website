import snapshotJson from "@/content/github.generated.json";

/** Public repo facts fetched at build time. Every field comes from the GitHub API. */
export interface RepoStats {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  fetchedAt: string;
}

const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

function isRepoStats(value: unknown): value is RepoStats {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.fullName === "string" &&
    typeof v.htmlUrl === "string" &&
    nullableString(v.description) &&
    nullableString(v.language) &&
    typeof v.stars === "number" &&
    nullableString(v.pushedAt) &&
    typeof v.archived === "boolean" &&
    typeof v.fork === "boolean" &&
    typeof v.fetchedAt === "string"
  );
}

/** "https://github.com/Owner/Repo" -> "owner/repo". */
function repoKey(url: string): string | null {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)$/i.exec(url.trim());
  return match ? match[1].toLowerCase() : null;
}

// Validated once at load. An entry that does not match the shape is dropped, not rendered.
const repoIndex = new Map<string, RepoStats>();
const snapshot = snapshotJson as unknown as {
  repos?: Record<string, unknown>;
  profile?: { publicRepos?: unknown } | null;
};
for (const [key, value] of Object.entries(snapshot.repos ?? {})) {
  if (isRepoStats(value)) repoIndex.set(key.toLowerCase(), value);
}

/** Live facts for a project's repo, or null when there is no repo or no valid snapshot entry. */
export function getRepoStats(repoUrl: string | null): RepoStats | null {
  if (!repoUrl) return null;
  const key = repoKey(repoUrl);
  return key ? (repoIndex.get(key) ?? null) : null;
}

/** Every valid repo in the snapshot. */
export function getTrackedRepos(): RepoStats[] {
  return [...repoIndex.values()];
}

/** Public repo count from the profile snapshot, or null if the profile was never fetched. */
export function getPublicRepoCount(): number | null {
  const count = snapshot.profile?.publicRepos;
  return typeof count === "number" ? count : null;
}