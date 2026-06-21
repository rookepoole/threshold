import {
  FIELD_LIMITS,
  clampText,
  normalizeHttpsUrl,
  normalizeOptionalIsoDate,
} from "./safety";

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
  const fallbackReleaseUrl = `https://github.com/${repository}/releases`;
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
    tagName: clampText(release.tag_name, FIELD_LIMITS.releaseName),
    name:
      clampText(release.name, FIELD_LIMITS.releaseName) ||
      clampText(release.tag_name, FIELD_LIMITS.releaseName),
    body: clampText(release.body, FIELD_LIMITS.releaseBody),
    htmlUrl: normalizeHttpsUrl(release.html_url, fallbackReleaseUrl),
    publishedAt: normalizeOptionalIsoDate(release.published_at),
    assets: Array.isArray(release.assets)
      ? release.assets.map((asset) => ({
          name: clampText(asset.name, FIELD_LIMITS.releaseName),
          size: Number.isFinite(asset.size) ? asset.size : 0,
          downloadUrl: normalizeHttpsUrl(asset.browser_download_url, fallbackReleaseUrl),
        }))
      : [],
  };
}

function toNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
