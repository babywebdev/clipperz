#!/usr/bin/env node

const path = require("node:path");
const {existsSync} = require("node:fs");
const {pathToFileURL} = require("node:url");
const rendererRoot = path.resolve(__dirname, "..", "..", "node_modules", "@remotion", "renderer", "dist");
const {openBrowser, ensureBrowser} = require("@remotion/renderer");
const {screenshot} = require(path.join(rendererRoot, "puppeteer-screenshot.js"));

const [htmlPath, outputPath, widthArg, heightArg, waitMsArg] = process.argv.slice(2);

if (!htmlPath || !outputPath || !widthArg || !heightArg) {
  console.error(
    "Usage: remotion_screenshot.cjs <html_path> <output_path> <width> <height> [wait_ms]",
  );
  process.exit(1);
}

const width = Number(widthArg);
const height = Number(heightArg);
const waitMs = Number(waitMsArg || "1500");

const waitForAssets = async (page) => {
  await page
    .evaluate(async () => {
      const images = Array.from(document.images || []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            img.addEventListener("load", resolve, {once: true});
            img.addEventListener("error", resolve, {once: true});
          });
        }),
      );

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
        }
      }
    })
    .catch(() => undefined);
};

(async () => {
  const localOnly = process.env.PODCLI_LOCAL_ONLY === "1";
  const browserExecutable = process.env.PODCLI_BROWSER || null;
  if (localOnly && (!browserExecutable || !path.isAbsolute(browserExecutable) || !existsSync(browserExecutable))) {
    throw new Error("Local thumbnail rendering requires the configured browser executable.");
  }
  const chromeMode = browserExecutable ? "chrome-for-testing" : "headless-shell";
  const {restrictLocalRenderBrowser} = await import("../../remotion/local-browser.mjs");
  const releaseBrowserGuard = localOnly ? await restrictLocalRenderBrowser(browserExecutable) : null;
  let browser;
  try {
    if (!localOnly) await ensureBrowser({logLevel: "error", browserExecutable, chromeMode});
    browser = await openBrowser("chrome", {logLevel: "error", browserExecutable, chromeMode});
    const closeBrowser = () => { try { browser.close({silent: true}); } catch {} };
    process.on("SIGINT", () => { closeBrowser(); process.exit(1); });
    process.on("SIGTERM", () => { closeBrowser(); process.exit(1); });
    const page = await browser.newPage({
      context: () => null,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: () => undefined,
      onLog: () => undefined,
    });
    await page.setViewport({width, height, deviceScaleFactor: 1});
    await page.goto({
      url: pathToFileURL(path.resolve(htmlPath)).href,
      timeout: Math.max(30000, waitMs + 10000),
      options: {
        waitUntil: "load",
      },
    });
    await waitForAssets(page);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    await screenshot({
      page,
      path: outputPath,
      type: "png",
      width,
      height,
      scale: 1,
    });
    await page.close();
  } finally {
    try {
      if (browser) await browser.close({silent: true});
    } finally {
      if (releaseBrowserGuard) await releaseBrowserGuard();
    }
  }
})().catch((err) => {
  console.error(err && (err.stack || err.message) ? err.stack || err.message : String(err));
  process.exit(1);
});
