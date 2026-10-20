// Build-time GitHub snapshot. Runs before `astro build` via the npm "prebuild" script.
// Never fails the build: any error keeps the last good snapshot entry for that repo.
import { readFile, writeFile } from "node:fs/promises";

const PROJECTS_FILE = new URL("../src/content/projects.ts", import.meta.url);
const SNAPSHOT_FILE = new URL("../src/content/github.generated.json", import.meta.url);
const OWNER = "1forsithlord";
const API = "https://api.github.com";
const TIMEOUT_MS = 10_000;

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "yash-portfolio-build",
};
// Optional. Unauthenticated works for public repos (60 requests per hour), which is plenty for one build.
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const log = (message) => console.log(`[github] ${message}`);

/** Reads repoUrl values from projects.ts: lines like repoUrl: "https://github.com/owner/repo". */
async function listRepoKeys() {
  const source = await readFile(PROJECTS_FILE, "utf8");
  const pattern = /repoUrl:\s*"https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)"/g;
  const keys = new Set();
  for (const match of source.matchAll(pattern)) keys.add(`${match[1]}/${match[2]}`);
  return [...keys];
}

async function getJson(path) {
  const response = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

function requireString(value, field) {
  if (typeof value !== "string") throw new Error(`missing or invalid ${field}`);
  return value;
}

function optionalString(value) {
  return typeof value === "string" ? value : null;
}

/** Copies only the fields the site uses. Anything missing fails the entry, so nothing is invented. */
function toRepoRecord(data, fetchedAt) {
  if (typeof data.stargazers_count !== "number") throw new Error("missing stargazers_count");
  return {
    fullName: requireString(data.full_name, "full_name"),
    htmlUrl: requireString(data.html_url, "html_url"),
    description: optionalString(data.description),
    language: optionalString(data.language),
    stars: data.stargazers_count,
    pushedAt: optionalString(data.pushed_at),
    archived: data.archived === true,
    fork: data.fork === true,
    fetchedAt,
  };
}

function toProfileRecord(data, fetchedAt) {
  if (typeof data.public_repos !== "number") throw new Error("missing public_repos");
  return { publicRepos: data.public_repos, fetchedAt };
}

async function readPrevious() {
  try {
    const parsed = JSON.parse(await readFile(SNAPSHOT_FILE, "utf8"));
    return { profile: parsed.profile ?? null, repos: parsed.repos ?? {} };
  } catch {
    return { profile: null, repos: {} };
  }
}

async function main() {
  const repoKeys = await listRepoKeys();
  if (repoKeys.length === 0) log("warning: no repoUrl values found in projects.ts");

  const previous = await readPrevious();
  const fetchedAt = new Date().toISOString();
  let successes = 0;
  let failures = 0;

  let profile = previous.profile;
  try {
    profile = toProfileRecord(await getJson(`/users/${OWNER}`), fetchedAt);
    successes += 1;
  } catch (error) {
    failures += 1;
    log(`profile ${OWNER} kept from last snapshot: ${error.message}`);
  }

  const repos = {};
  for (const key of repoKeys) {
    try {
      repos[key] = toRepoRecord(await getJson(`/repos/${key}`), fetchedAt);
      successes += 1;
    } catch (error) {
      failures += 1;
      log(`${key} kept from last snapshot: ${error.message}`);
      if (previous.repos[key]) repos[key] = previous.repos[key];
    }
  }

  // Nothing fetched: leave the committed file alone so git does not churn on every failed build.
  if (successes === 0) {
    log("no request succeeded; snapshot file unchanged");
    return;
  }

  const snapshot = { fetchedAt, profile, repos };
  await writeFile(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);
  log(`wrote snapshot: ${successes} fetched, ${failures} kept from last snapshot`);
}

main().catch((error) => {
  log(`unexpected error, snapshot unchanged: ${error.message}`);
});