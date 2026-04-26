#!/usr/bin/env node
/**
 * 历史兼容入口：`pack-v203.mjs` 已停止单独维护。
 * 当前 WorkBuddy 官方审核包统一由 `scripts/pack-v210.mjs` 生成。
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(__dirname, 'pack-v210.mjs');

console.warn('[deprecated] `pack-v203.mjs` 已切换为 `pack-v210.mjs` 兼容入口，当前将生成 v2.1.0 官方审核包。');

try {
  execFileSync(process.execPath, [TARGET], {
    cwd: ROOT,
    stdio: 'inherit',
  });
} catch (error) {
  process.exit(error?.status ?? 1);
}
