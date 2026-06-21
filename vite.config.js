import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");
const appVersion = process.env.npm_package_version ?? packageJson.version ?? "0.0.0";
const repository = process.env.VITE_GITHUB_REPOSITORY ?? "rookepoole/threshold";
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __REPOSITORY__: JSON.stringify(repository),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  test: {
    environment: "jsdom",
  },
});
