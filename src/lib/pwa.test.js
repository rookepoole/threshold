import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(testDir, "../../public");

describe("PWA install assets", () => {
  it("declares the icon sizes browsers expect for installation", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicDir, "manifest.webmanifest"), "utf8"),
    );

    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe(".");
    expect(hasIcon(manifest, "192x192")).toBe(true);
    expect(hasIcon(manifest, "512x512")).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);

    for (const icon of manifest.icons) {
      expect(fs.existsSync(path.join(publicDir, icon.src))).toBe(true);
    }
  });

  it("keeps the service worker able to handle app fetches", () => {
    const serviceWorker = fs.readFileSync(path.join(publicDir, "sw.js"), "utf8");

    expect(serviceWorker).toContain('addEventListener("fetch"');
    expect(serviceWorker).toContain("networkFirst");
    expect(serviceWorker).toContain("staleWhileRevalidate");
  });

  it("ships a content security policy for the hosted app", () => {
    const indexHtml = fs.readFileSync(path.resolve(publicDir, "../index.html"), "utf8");

    expect(indexHtml).toContain("Content-Security-Policy");
    expect(indexHtml).toContain("script-src 'self'");
    expect(indexHtml).toContain("object-src 'none'");
  });
});

function hasIcon(manifest, size) {
  return manifest.icons.some((icon) => icon.sizes === size && icon.type === "image/png");
}
