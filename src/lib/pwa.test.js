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

    expect(serviceWorker).toContain('const VERSION = "threshold-sw-v7"');
    expect(serviceWorker).toContain('addEventListener("fetch"');
    expect(serviceWorker).toContain("networkFirst");
    expect(serviceWorker).toContain("staleWhileRevalidate");
    expect(serviceWorker).toContain("THRESHOLD_SKIP_WAITING");
  });

  it("registers a versioned service worker and reloads installed apps after updates", () => {
    const main = fs.readFileSync(path.resolve(testDir, "../main.jsx"), "utf8");

    expect(main).toContain("APP_VERSION");
    expect(main).toContain("sw.js?v=${APP_VERSION}");
    expect(main).toContain("registration.update()");
    expect(main).toContain("updatefound");
    expect(main).toContain("controllerchange");
    expect(main).toContain("window.location.reload()");
  });

  it("reads the package version directly when building app metadata", () => {
    const viteConfig = fs.readFileSync(
      path.resolve(testDir, "../../vite.config.js"),
      "utf8",
    );

    expect(viteConfig).toContain('require("./package.json")');
    expect(viteConfig).toContain("packageJson.version");
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
