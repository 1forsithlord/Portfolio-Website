import { projects } from "@/content/projects";
import { getPublicRepoCount, getTrackedRepos } from "@/lib/github";

/** Numbers shown on the page. Each one is either a real count or null (hidden). Nothing is invented. */
export interface SiteStats {
  /** Projects listed in projects.ts. Always real. */
  projectCount: number;
  /** Public repos on the GitHub profile, from the build snapshot. */
  publicRepos: number | null;
  /** Stars summed over the tracked repos, from the build snapshot. */
  totalStars: number | null;
  /** How many repos the star total covers. */
  trackedRepos: number;
}

export function getSiteStats(): SiteStats {
  const repos = getTrackedRepos();
  const totalStars = repos.length > 0 ? repos.reduce((sum, repo) => sum + repo.stars, 0) : null;
  return {
    projectCount: projects.length,
    publicRepos: getPublicRepoCount(),
    totalStars,
    trackedRepos: repos.length,
  };
}
