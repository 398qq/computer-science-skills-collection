#!/usr/bin/env node
import path from "path";
import { spawnSync } from "child_process";

function parseArgs(argv) {
  const o = {
    skillRoot: process.cwd(),
    bookRoot: null,
    strict: false,
    noQueryOpt: false,
    noPendingVerification: false,
    noBrokenLinks: false,
    noStructureGuard: false,
    noScenePackCheck: false,
    noEntryGate: false,
    brokenLinksChannel: "user",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skill-root") o.skillRoot = argv[++i];
    else if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--strict") o.strict = true;
    else if (a === "--no-query-opt") o.noQueryOpt = true;
    else if (a === "--no-pending-verification") o.noPendingVerification = true;
    else if (a === "--no-broken-links") o.noBrokenLinks = true;
    else if (a === "--no-structure-guard") o.noStructureGuard = true;
    else if (a === "--no-scene-pack-check") o.noScenePackCheck = true;
    else if (a === "--no-entry-gate") o.noEntryGate = true;
    else if (a === "--broken-links-channel") o.brokenLinksChannel = argv[++i] || "user";
  }
  return o;
}

function runNode(scriptPath, args) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], { stdio: "inherit" });
  return typeof r.status === "number" ? r.status : 2;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error(
      "用法: node scripts/run-p0-audits.mjs --skill-root <技能根> --book-root <本书根> " +
        "[--strict] [--no-query-opt] [--no-pending-verification] [--no-broken-links] [--no-structure-guard] [--no-scene-pack-check] [--no-entry-gate] [--broken-links-channel user|all]"
    );
    process.exit(2);
  }

  const skillRoot = path.resolve(args.skillRoot || process.cwd());
  const bookRoot = path.resolve(args.bookRoot);
  const scriptsRoot = path.resolve(skillRoot, "scripts");

  if (!args.noQueryOpt) {
    console.log("[P0-Audit] 1/6 audit-query-optimization");
    const qArgs = ["--skill-root", skillRoot, "--book-root", bookRoot];
    if (args.strict) qArgs.push("--enforce", "--require-ledger");

    const qCode = runNode(path.join(scriptsRoot, "audit-query-optimization.mjs"), qArgs);
    if (qCode !== 0) process.exit(qCode);
  } else {
    console.log("[P0-Audit] 1/6 skipped: audit-query-optimization");
  }

  if (!args.noPendingVerification) {
    console.log("[P0-Audit] 2/6 audit-pending-verification");
    const pArgs = ["--book-root", bookRoot];
    if (args.strict) pArgs.push("--enforce", "--require-ledger");

    const pCode = runNode(path.join(scriptsRoot, "audit-pending-verification.mjs"), pArgs);
    if (pCode !== 0) process.exit(pCode);
  } else {
    console.log("[P0-Audit] 2/6 skipped: audit-pending-verification");
  }

  if (!args.noBrokenLinks) {
    console.log("[P0-Audit] 3/6 audit-broken-links");
    const bArgs = ["--root", skillRoot, "--channel", args.brokenLinksChannel];
    if (args.strict) bArgs.push("--enforce");
    const bCode = runNode(path.join(scriptsRoot, "audit-broken-links.mjs"), bArgs);
    if (bCode !== 0) process.exit(bCode);
  } else {
    console.log("[P0-Audit] 3/6 skipped: audit-broken-links");
  }

  if (!args.noStructureGuard) {
    console.log("[P0-Audit] 4/6 structural-bottleneck-guard");
    const sArgs = ["--skill-root", skillRoot, "--book-root", bookRoot];
    if (args.strict) sArgs.push("--enforce");
    const sCode = runNode(path.join(scriptsRoot, "structural-bottleneck-guard.mjs"), sArgs);
    if (sCode !== 0) process.exit(sCode);
  } else {
    console.log("[P0-Audit] 4/6 skipped: structural-bottleneck-guard");
  }

  if (!args.noScenePackCheck) {
    console.log("[P0-Audit] 5/6 scene-pack-check");
    const spCode = runNode(path.join(scriptsRoot, "wecom", "scene-pack-admin.mjs"), ["check"]);
    if (spCode !== 0) process.exit(spCode);
  } else {
    console.log("[P0-Audit] 5/6 skipped: scene-pack-check");
  }

  if (!args.noEntryGate) {
    console.log("[P0-Audit] 6/6 entry-performance-gate");
    const eArgs = ["--skill-root", skillRoot, "--book-root", bookRoot, "--channel", args.brokenLinksChannel];
    if (args.strict) eArgs.push("--enforce");
    const eCode = runNode(path.join(scriptsRoot, "audit-entry-performance.mjs"), eArgs);
    if (eCode !== 0) process.exit(eCode);
  } else {
    console.log("[P0-Audit] 6/6 skipped: entry-performance-gate");
  }

  console.log("[P0-Audit] ✅ all checks passed");
}

main();
