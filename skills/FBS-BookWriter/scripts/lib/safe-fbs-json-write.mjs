/**
 * 安全写入 .fbs 下 JSON：临时文件 + rename，可选 .bak 备份。
 * 防止异常中断产生半写入；便于从误写恢复。
 */
import fs from 'fs';
import path from 'path';

/**
 * @param {string} fbsDir 已解析的 .fbs 目录绝对路径
 * @param {string} fileName 仅文件名，如 workbuddy-resume.json
 */
export function resolveFbsJsonPath(fbsDir, fileName) {
  const base = path.resolve(fbsDir);
  const out = path.join(base, fileName);
  const rel = path.relative(base, out);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`safe-fbs-json-write: 拒绝路径越界 ${fileName}`);
  }
  if (path.basename(out) !== fileName) {
    throw new Error(`safe-fbs-json-write: 非法文件名 ${fileName}`);
  }
  return out;
}

/**
 * @param {string} fbsDir
 * @param {string} fileName
 * @param {object} obj 可 JSON.stringify 的对象
 * @param {{ backup?: boolean, quiet?: boolean }} [opts]
 */
export function writeJsonAtomic(fbsDir, fileName, obj, opts = {}) {
  const { backup = true, quiet = false } = opts;
  const outPath = resolveFbsJsonPath(fbsDir, fileName);
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('safe-fbs-json-write: 根类型须为 JSON object');
  }
  const payload = `${JSON.stringify(obj, null, 2)}\n`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp.${process.pid}`;
  const bak = `${outPath}.bak`;

  if (backup && fs.existsSync(outPath)) {
    try {
      fs.copyFileSync(outPath, bak);
    } catch (e) {
      if (!quiet) console.warn('[safe-fbs-json-write] 备份 .bak 失败:', e.message);
    }
  }

  fs.writeFileSync(tmp, payload, 'utf8');
  fs.renameSync(tmp, outPath);
}
