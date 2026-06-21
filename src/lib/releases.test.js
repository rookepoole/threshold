import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compareVersions,
  fetchLatestRelease,
  isReleaseNewer,
  normalizeVersion,
} from "./releases";
import { FIELD_LIMITS } from "./safety";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("release version helpers", () => {
  it("normalizes common GitHub tag shapes", () => {
    expect(normalizeVersion("v1.2.3")).toBe("1.2.3");
    expect(normalizeVersion("refs/tags/v2.0.0")).toBe("2.0.0");
    expect(normalizeVersion("release/3.4.5")).toBe("3.4.5");
  });

  it("compares semver-like versions", () => {
    expect(compareVersions("1.2.0", "1.2.1")).toBe(-1);
    expect(compareVersions("1.3.0", "1.2.9")).toBe(1);
    expect(compareVersions("v2.0.0", "2.0")).toBe(0);
  });

  it("detects newer release tags", () => {
    expect(isReleaseNewer("0.1.0", "v0.1.1")).toBe(true);
    expect(isReleaseNewer("0.1.0", "v0.1.0")).toBe(false);
  });

  it("sanitizes release payloads before the app renders them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: "v9.9.9",
          name: "x".repeat(500),
          body: "b".repeat(10_000),
          html_url: "javascript:alert(1)",
          published_at: "2026-06-21T00:00:00Z",
          assets: [
            {
              name: "asset".repeat(100),
              size: Number.NaN,
              browser_download_url: "data:text/html,boom",
            },
          ],
        }),
      })),
    );

    const release = await fetchLatestRelease("rookepoole/threshold");

    expect(release.name).toHaveLength(FIELD_LIMITS.releaseName);
    expect(release.body).toHaveLength(FIELD_LIMITS.releaseBody);
    expect(release.htmlUrl).toBe("https://github.com/rookepoole/threshold/releases");
    expect(release.assets[0].size).toBe(0);
    expect(release.assets[0].downloadUrl).toBe(
      "https://github.com/rookepoole/threshold/releases",
    );
  });
});
