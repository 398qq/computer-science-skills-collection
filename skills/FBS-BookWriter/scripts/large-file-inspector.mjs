#!/usr/bin/env node
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const o = {
    root: process.cwd(),
    top: 30,
    minKb: 20,
    exts: [".md", ".mjs", ".js", ".json"],
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") o.root = argv[++i];
    else if (a === "--top") o.top = Number(argv[++i] || 30);
    else if (a === "--min-kb") o.minKb = Number(argv[++i] || 20);
    else if (a === "--exts") o.exts = String(argv[++i] || "").split(",").map((x) => x.trim()).filter(Boolean);
  }
  return o;
}

function shouldSkipDir(name) {
  return ["node_modules", ".git", "dist", "test-unzip", "final-test"].includes(name);
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root);
  const rows = [];

  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (shouldSkipDir(e.name)) continue;
        walk(path.join(dir, e.name));
        continue;
      }
      if (!e.isFile()) continue;
      const full = path.join(dir, e.name);
      const ext = path.extname(e.name).toLowerCase();
      if (!args.exts.includes(ext)) continue;

      const size = fs.statSync(full).size;
      const kb = size / 1024;
      if (kb < args.minKb) continue;

      let lines = 0;
      try {
        lines = fs.readFileSync(full, "utf8").split(/\r?\n/).length;
      } catch {
        lines = -1;
      }

      rows.push({
        file: path.relative(root, full).replace(/\\/g, "/"),
        kb: Number(kb.toFixed(1)),
        lines,
      });
    }
  };

  walk(root);
  rows.sort((a, b) => b.kb - a.kb);
  const topRows = rows.slice(0, args.top);

  console.log(JSON.stringify({ root, total: rows.length, top: topRows }, null, 2));
}

main();
