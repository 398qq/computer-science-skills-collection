#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const o = { root: process.cwd(), channel: 'all', enforce: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = argv[++i];
    else if (a === '--channel') o.channel = argv[++i];
    else if (a === '--enforce') o.enforce = true;
  }
  return o;
}

function listMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root);
  const scanRoots = [];
  if (args.channel === 'user') scanRoots.push(path.join(root, 'FBS-BookWriter', 'references'), path.join(root, 'SKILL.md'));
  else scanRoots.push(path.join(root, 'FBS-BookWriter', 'references'), path.join(root, 'SKILL.md'));

  const files = [];
  for (const r of scanRoots) {
    if (r.endsWith('.md')) {
      if (fs.existsSync(r)) files.push(r);
    } else {
      files.push(...listMd(r));
    }
  }

  const broken = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1].trim();
      if (!raw || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#')) continue;
      const filePart = raw.split('#')[0];
      if (!filePart) continue;
      const target = path.resolve(path.dirname(f), filePart);
      if (!fs.existsSync(target)) broken.push({ file: f, link: raw, resolved: target });
    }
  }

  console.log(`audit-broken-links: 扫描文件=${files.length}, 断链=${broken.length}`);
  broken.slice(0, 40).forEach((x) => console.log(`  - ${x.file} -> ${x.link}`));

  if (args.enforce && broken.length > 0) process.exit(1);
  process.exit(0);
}

main();
