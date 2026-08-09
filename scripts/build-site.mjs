#!/usr/bin/env node
/**
 * Assembles the Cloudflare-deployed demo into `site-dist/`.
 *
 * There is deliberately no bundler here. The package compiles to plain ESM
 * with relative `./foo.js` specifiers, which browsers resolve natively, so
 * the demo can import `dist/` exactly as published -- the same bytes npm
 * consumers get. Bundling would obscure the one claim the site exists to
 * demonstrate: that this thing runs in a browser with nothing else present.
 *
 * Output layout:
 *   site-dist/index.html   <- copied from site/
 *   site-dist/lib/**       <- copied from dist/ (built by `npm run build`)
 */

import { cp, rm, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = path.join(root, "site");
const out = path.join(root, "site-dist");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(dist))) {
  console.error(
    "dist/ not found -- run `npm run build` first (build:site does this for you).",
  );
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await cp(site, out, { recursive: true });

// Declarations are for npm consumers, not browsers -- the page imports the
// .js files and would never fetch these.
await cp(dist, path.join(out, "lib"), {
  recursive: true,
  filter: (src) => !src.endsWith(".d.ts"),
});

console.log(`built site-dist/ (html from site/, library from dist/)`);
