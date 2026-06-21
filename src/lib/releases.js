export const APP_VERSION =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

export const REPOSITORY =
  typeof __REPOSITORY__ === "string" ? __REPOSITORY__ : "rookepoole/threshold";

export function normalizeVersion(value) {
  return String(value ?? "")
    .trim()
    .replace(/^refs\/tags\//, "")
    .replace(/^release[-/]/i, "")
    .replace(/^v/i, "")
    .split(/[+-]/)[0];
}

export function compareVersions(a, b) {
  const left = normalizeVersion(a).split(".").map(toNumber);
  const right = normalizeVersion(b).split(".").map(toNumber);
  const length = Math.max(left.length, right.length, 3);

  for (let index = 0; index < length; index += 1) {
    const current = left[index] ?? 0;
    const latest = right[index] ?? 0;
    if (current > latest) return 1;
    if (current < latest) return -1;
  }

  return 0;
}

export function isReleaseNewer(currentVersion, releaseTag) {
  return compareVersions(currentVersion, releaseTag) < 0;
}

export async function fetchLatestRelease(repository = REPOSITORY) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub release check failed with ${response.status}`);
  }

  const release = await response.json();

  return {
    tagName: release.tag_name,
    name: release.name || release.tag_name,
    body: release.body || "",
    htmlUrl: release.html_url,
    publishedAt: release.published_at,
    assets: Array.isArray(release.assets)
      ? release.assets.map((asset) => ({
          name: asset.name,
          size: asset.size,
          downloadUrl: asset.browser_download_url,
        }))
      : [],
  };
}

function toNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
