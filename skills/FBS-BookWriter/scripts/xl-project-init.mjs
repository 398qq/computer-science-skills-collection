/**
 * xl-project-init.mjs — XL 项目规模检测与分卷初始化器
 * FBS-BookWriter v2.0.3 | [D2] 大型书稿支持
 *
 * 功能：自动检测书稿规模，按四级分类，生成分卷索引
 *
 * 规模等级：
 *   S  — < 10 万字，单文件处理
 *   M  — 10-30 万字，建议分卷
 *   L  — 30-100 万字，分卷推荐
 *   XL — ≥ 100 万字，分卷必须，支持断点续检
 *
 * 输出：
 *   .fbs/volumes-index.json   — 分卷索引
 *   project-config.json       — 写入 projectScale 字段
 *
 * CLI：
 *   node xl-project-init.mjs [--book-root <path>] [--resume-from-volume <N>]
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const SCALE_THRESHOLDS = {
  XL: 1_000_000,
  L:  300_000,
  M:  100_000,
};

/** 递归统计目录下所有 .md 文件字符数 */
function countCharsInDir(dir) {
  let total = 0;
  const files = [];

  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const fp = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(fp);
      } else if (e.isFile() && e.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fp, 'utf8');
          total += content.length;
          files.push({ path: fp, chars: content.length });
        } catch { /* ignore */ }
      }
    }
  }

  walk(dir);
  return { total, files };
}

/** 判断规模等级 */
function resolveScale(chars) {
  if (chars >= SCALE_THRESHOLDS.XL) return 'XL';
  if (chars >= SCALE_THRESHOLDS.L) return 'L';
  if (chars >= SCALE_THRESHOLDS.M) return 'M';
  return 'S';
}

/** 将文件列表分配到卷（每卷约 30 万字） */
function buildVolumes(files, targetCharsPerVolume = 300_000) {
  const volumes = [];
  let currentVolume = { index: 1, files: [], chars: 0 };

  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    if (currentVolume.chars > 0 && currentVolume.chars + f.chars > targetCharsPerVolume) {
      volumes.push({ ...currentVolume });
      currentVolume = { index: volumes.length + 1, files: [], chars: 0 };
    }
    currentVolume.files.push(f.path);
    currentVolume.chars += f.chars;
  }
  if (currentVolume.files.length > 0) volumes.push(currentVolume);

  return volumes;
}

/**
 * 初始化 XL 项目分卷
 * @param {object} options
 * @param {string} [options.bookRoot]          书稿根目录
 * @param {number} [options.resumeFromVolume]  断点续检起始卷号（1-based）
 * @param {boolean} [options.quiet]            静默模式
 */
export async function xlProjectInit({ bookRoot, resumeFromVolume = null, quiet = false } = {}) {
  const root = bookRoot || process.cwd();
  const fbs = path.join(root, '.fbs');

  // 统计字数
  const { total: totalChars, files } = countCharsInDir(root);
  const scale = resolveScale(totalChars);

  if (!quiet) {
    console.log(`[xl-init] 书稿规模检测：${totalChars.toLocaleString()} 字 → 等级 ${scale}`);
  }

  // 生成分卷索引（M 及以上才分卷）
  let volumes = [];
  if (scale === 'M' || scale === 'L' || scale === 'XL') {
    const targetPerVolume = scale === 'XL' ? 300_000 : scale === 'L' ? 150_000 : 80_000;
    volumes = buildVolumes(files, targetPerVolume);
  }

  const volumesIndex = {
    $schema: 'fbs-volumes-index-v1',
    generatedAt: new Date().toISOString(),
    bookRoot: root,
    totalChars,
    scale,
    volumeCount: volumes.length || 1,
    resumeFromVolume: resumeFromVolume || null,
    volumes: volumes.length > 0 ? volumes : [{ index: 1, files: files.map(f => f.path), chars: totalChars }],
    scaleThresholds: SCALE_THRESHOLDS,
  };

  // 写入 volumes-index.json
  try {
    fs.mkdirSync(fbs, { recursive: true });
    const idxPath = path.join(fbs, 'volumes-index.json');
    fs.writeFileSync(idxPath, JSON.stringify(volumesIndex, null, 2), 'utf8');
    if (!quiet) console.log(`[xl-init] 分卷索引已写入 ${idxPath}`);
  } catch (e) {
    if (!quiet) console.error('[xl-init] 写入 volumes-index.json 失败:', e.message);
  }

  // 更新 project-config.json 中的 projectScale
  const configPath = path.join(fbs, 'project-config.json');
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    config.projectScale = scale;
    config.totalChars = totalChars;
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    if (!quiet) console.log(`[xl-init] project-config.json 已更新 projectScale=${scale}`);
  } catch (e) {
    if (!quiet) console.error('[xl-init] 更新 project-config.json 失败:', e.message);
  }

  return volumesIndex;
}

// ── CLI 入口 ──
if (process.argv[1] && process.argv[1].endsWith('xl-project-init.mjs')) {
  const argv = process.argv;
  const bookRoot = argv.includes('--book-root')
    ? argv[argv.indexOf('--book-root') + 1]
    : process.cwd();
  const resumeFromVolume = argv.includes('--resume-from-volume')
    ? Number(argv[argv.indexOf('--resume-from-volume') + 1]) || null
    : null;
  const quiet = argv.includes('--quiet');

  xlProjectInit({ bookRoot, resumeFromVolume, quiet }).then(idx => {
    if (quiet) console.log(JSON.stringify(idx, null, 2));
    else console.log(`\n分卷规划：共 ${idx.volumeCount} 卷，规模等级 ${idx.scale}`);
  }).catch(err => {
    console.error('xl-project-init 失败:', err.message);
    process.exit(1);
  });
}
