import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const brandAssets = ["clipperz-badge.png", "clipperz-icon.png"];
const brandFile = (name: string) => resolve(here, "../../../public", name);

export default defineConfig({
  root: here,
  plugins: [react(), {
    name: "clipperz-brand-assets",
    // public/ is the single source for the supplied branding in dev and builds.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? "").split("?")[0].slice(1);
        if (!brandAssets.includes(name)) return next();
        res.setHeader("Content-Type", "image/png");
        res.end(readFileSync(brandFile(name)));
      });
    },
    generateBundle() {
      for (const name of brandAssets) {
        this.emitFile({ type: "asset", fileName: name, source: readFileSync(brandFile(name)) });
      }
    },
  }],
  publicDir: resolve(here, "../public"),
  build: {
    outDir: resolve(here, "../../../dist/ui/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3847",
    },
  },
});
