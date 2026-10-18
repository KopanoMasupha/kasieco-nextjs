// Builds the whole app into ONE offline HTML file: prototype/dist/mzansiconnect-prototype.html
// The server reducer runs in the browser and saves to localStorage, so no server is needed.
// Usage: npm run build:prototype
import * as esbuild from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "dist");
const shim = (f) => path.join(here, "shims", f);
fs.mkdirSync(out, { recursive: true });

// product photos: inline every /public/products image so the single file works offline
const photoDir = path.join(root, "public", "products");
const photos = fs.existsSync(photoDir) ? fs.readdirSync(photoDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
const mime = (f) => (/\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg");
const inlinePhotos = {
  name: "inline-product-photos",
  setup(build) {
    build.onResolve({ filter: /(^|\/)photoUrl$/ }, () => ({ path: "photoUrl", namespace: "photos" }));
    build.onLoad({ filter: /.*/, namespace: "photos" }, () => {
      const map = Object.fromEntries(photos.map((f) => [f, `data:${mime(f)};base64,${fs.readFileSync(path.join(photoDir, f)).toString("base64")}`]));
      return { contents: `const M = ${JSON.stringify(map)};\nexport const photoUrl = (file) => M[file] ?? "";`, loader: "js" };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(here, "entry.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2019",
  outdir: out,
  jsx: "automatic",
  tsconfig: path.join(here, "tsconfig.json"),
  nodePaths: [path.join(root, "node_modules")],
  alias: {
    "next/link": shim("link.tsx"),
    "next/navigation": shim("router.tsx"),
    "next/dynamic": shim("dynamic.tsx"),
    fs: shim("node.ts"),
    path: shim("node.ts"),
  },
  inject: [shim("process.js")],
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".png": "dataurl" },
  logLevel: "warning",
  plugins: [inlinePhotos],
});

execSync(`npx tailwindcss -c "${path.join(here, "tailwind.config.ts")}" -i app/globals.css -o "${path.join(out, "tw.css")}" --minify`, { cwd: root, stdio: "inherit" });

const js = fs.readFileSync(path.join(out, "entry.js"), "utf8").replace(/<\/script/g, "<\\/script");
const entryCss = fs.existsSync(path.join(out, "entry.css")) ? fs.readFileSync(path.join(out, "entry.css"), "utf8") : "";
const css = fs.readFileSync(path.join(out, "tw.css"), "utf8") + entryCss;
const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MzansiConnect</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap">
<style>:root{color-scheme:light}html,body{background:#f6f2ec;color:#171310}${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
const file = path.join(out, "mzansiconnect-prototype.html");
fs.writeFileSync(file, html);
console.log(`Built ${path.relative(root, file)} (${(html.length / 1024).toFixed(0)} KB)`);
