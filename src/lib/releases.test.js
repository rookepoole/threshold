import { describe, expect, it } from "vitest";
import { compareVersions, isReleaseNewer, normalizeVersion } from "./releases";

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
});
