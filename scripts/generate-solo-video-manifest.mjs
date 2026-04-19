import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT_ROOT, "client", "public", "solo-videos");
const OUT_PATH = path.join(PUBLIC_DIR, "manifest.json");

const CATEGORY_DIRS = [
  { dir: "ball-mastery", category: "ball_mastery" },
  { dir: "finition", category: "finishing" },
  { dir: "agility", category: "agility" },
  { dir: "first-touch", category: "first_touch" },
];

function ensureExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Missing folder: ${p}`);
  }
}

function cleanTitle(filename) {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodePath(p) {
  return p
    .split(path.sep)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function listVideoFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!/\.(mp4|mov)$/i.test(ent.name)) continue;
    files.push(ent.name);
  }
  return files.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function main() {
  ensureExists(PUBLIC_DIR);

  const items = [];
  for (const { dir, category } of CATEGORY_DIRS) {
    const abs = path.join(PUBLIC_DIR, dir);
    ensureExists(abs);
    const files = listVideoFiles(abs);
    for (const filename of files) {
      const url = `/${encodePath(path.join("solo-videos", dir, filename))}`;
      items.push({
        category,
        title: cleanTitle(filename),
        url,
      });
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(items, null, 2) + "\n", "utf-8");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${items.length} videos → ${path.relative(PROJECT_ROOT, OUT_PATH)}`);
}

main();

