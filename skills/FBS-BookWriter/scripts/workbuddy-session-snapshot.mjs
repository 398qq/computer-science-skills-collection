/**
 * workbuddy-session-snapshot.mjs — 会话快照生成器
 * FBS-BookWriter v2.0.3 | [D2] 续写快速恢复
 *
 * 功能：从 .fbs/esm-state.md 和 .fbs/chapter-status.md 自动读取当前状态，
 *       生成 .fbs/workbuddy-resume.json，
 *       将续写前置轮次从 5-8 轮压缩到 1-2 轮。
 *
 * 输出字段：
 *   currentStage   — 当前 ESM 阶段（S0/S1/S2/S3/S4/S5/S6）
 *   lastAction     — 上次操作描述
 *   nextSuggested  — 下一步建议操作
 *   bookTitle      — 书名
 *   wordCount      — 当前字数估算
 *   chapterCount   — 章节数
 *   completedCount — 已完成章节数
 *   updatedAt      — 快照生成时间
 */

import fs from 'fs';
import path from 'path';
import { writeJsonAtomic } from './lib/safe-fbs-json-write.mjs';

function tryReadBookTitleFromBrief(fbsDir) {
  const p = path.join(fbsDir, 'book-context-brief.md');
  if (!fs.existsSync(p)) return null;
  try {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const h = lines.find((l) => /^#+\s+\S/.test(l.trim()));
    if (!h) return null;
    return h.replace(/^#+\s*/, '').trim().slice(0, 120) || null;
  } catch {
    return null;
  }
}

/** 从 project-config.json 取书名与规划体量（一书一真值，与快照对齐） */
function readProjectConfigCanonical(fbsDir) {
  const p = path.join(fbsDir, 'project-config.json');
  if (!fs.existsSync(p)) {
    return { bookTitle: null, plannedChapterTotal: null, targetWordCount: null };
  }
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    let bookTitle = null;
    const t = j.bookTitle || j.workingTitle || j.projectTitle;
    if (t && typeof t === 'string') {
      const s = t.trim();
      if (s && !/^本书项目配置|^FBS-BookWriter/i.test(s)) bookTitle = s.slice(0, 120);
    }
    let plannedChapterTotal = null;
    if (j.plannedChapterTotal != null && j.plannedChapterTotal !== '') {
      const n = Number(j.plannedChapterTotal);
      if (Number.isFinite(n) && n > 0) plannedChapterTotal = Math.floor(n);
    }
    let targetWordCount = null;
    if (j.targetWordCount != null && j.targetWordCount !== '') {
      const n = Number(j.targetWordCount);
      if (Number.isFinite(n) && n > 0) targetWordCount = Math.floor(n);
    }
    return { bookTitle, plannedChapterTotal, targetWordCount };
  } catch {
    return { bookTitle: null, plannedChapterTotal: null, targetWordCount: null };
  }
}

/**
 * 当台账未写「章节总数」、仅 Markdown 标题计数偏小时，用 project-config 规划章数回退
 */
function mergeChapterCountFromConfig(chapterData, cfg) {
  const out = { ...chapterData };
  const planned = cfg.plannedChapterTotal;
  if (planned == null || planned <= 0) return out;

  if (out.chapterCountSource === 'explicit-line') {
    return out;
  }

  if (out.chapterCountSource === 'markdown-headers' && planned > out.chapterCount) {
    out.chapterCount = planned;
    out.chapterCountSource = 'project-config';
    out.completedCount = Math.min(out.completedCount, planned);
    return out;
  }

  if (out.chapterCount === 0 && planned > 0) {
    out.chapterCount = planned;
    out.chapterCountSource = 'project-config';
  }

  return out;
}

/**
 * 已完成章数不得超过「章节总数」真值（台账中 ✅ 可能远多于章条，或与 project-config 合并后出现倒挂）
 */
function clampChapterProgress(data) {
  const out = { ...data };
  const nch = Number(out.chapterCount) || 0;
  if (nch > 0) {
    const nd = Number(out.completedCount) || 0;
    out.completedCount = Math.min(nd, nch);
  }
  return out;
}

/** 从 esm-state.md 提取阶段信息 */
function parseEsmState(content) {
  const result = {
    currentStage: null,
    lastAction: null,
    bookTitle: null,
  };

  // 提取当前阶段（多种格式兼容）
  const stageMatch = content.match(/当前阶段[：:]\s*(S[0-6][a-zA-Z0-9\-]*)/i)
    || content.match(/stage[：:]\s*(S[0-6][a-zA-Z0-9\-]*)/i)
    || content.match(/\*\*阶段\*\*[：:]\s*(S[0-6][a-zA-Z0-9\-]*)/i)
    || content.match(/(S[0-6])[^a-zA-Z0-9]/);
  if (stageMatch) result.currentStage = stageMatch[1].toUpperCase();

  // 提取上次操作
  const actionMatch = content.match(/上次操作[：:]\s*([^\n]+)/i)
    || content.match(/last.?action[：:]\s*([^\n]+)/i)
    || content.match(/已完成[：:]\s*([^\n]+)/i);
  if (actionMatch) result.lastAction = actionMatch[1].trim().substring(0, 100);

  // 提取书名
  const titleMatch = content.match(/书名[：:]\s*([^\n]+)/i)
    || content.match(/title[：:]\s*([^\n]+)/i)
    || content.match(/作品[：:]\s*([^\n]+)/i);
  if (titleMatch) result.bookTitle = titleMatch[1].trim().substring(0, 50);

  return result;
}

/** 从 chapter-status.md 提取章节进度（优先读正文中的「章节总数」类显式数字，避免仅数 ## 与真实总章数不一致） */
function parseChapterStatus(content) {
  const result = {
    chapterCount: 0,
    completedCount: 0,
    wordCount: 0,
    chapterCountSource: null,
  };

  let explicitTotal = 0;
  const explicitRes = [
    content.match(/章节总数[：:\s]*(\d+)/i),
    content.match(/全书\s*共\s*(\d+)\s*章/i),
    content.match(/共\s*(\d+)\s*章/),
    content.match(/总章数[：:\s]*(\d+)/i),
    content.match(/规划\s*(\d+)\s*章/i),
    content.match(/目标\s*(\d+)\s*章/i),
  ];
  for (const m of explicitRes) {
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > 0) explicitTotal = Math.max(explicitTotal, n);
    }
  }

  const chapterLines = content.match(/^#{1,3}\s+.+/gm) || [];
  const headerTotal = chapterLines.filter(
    (l) => !l.includes('目录') && !l.includes('状态') && !l.includes('总览') && !l.includes('附录说明'),
  ).length;

  if (explicitTotal > 0) {
    result.chapterCount = explicitTotal;
    result.chapterCountSource = 'explicit-line';
  } else {
    result.chapterCount = headerTotal;
    result.chapterCountSource = 'markdown-headers';
  }

  const completedMatches = content.match(/✅|✓|\[x\]|已完成|DONE/gi) || [];
  result.completedCount = Math.min(completedMatches.length, result.chapterCount || 999999);

  const wordMatches = content.match(/(\d[\d,]+)\s*字/g) || [];
  wordMatches.forEach((m) => {
    const num = Number(String(m).replace(/[^\d]/g, ''));
    if (num > 0) result.wordCount += num;
  });

  const wan = content.match(/(\d+(?:\.\d+)?)\s*万\s*字?/) || content.match(/(\d+(?:\.\d+)?)\s*万(?!\s*章)/);
  if (wan) {
    const n = Math.round(parseFloat(wan[1]) * 10000);
    if (n > result.wordCount) result.wordCount = n;
  }

  return result;
}

/** 根据阶段推断下一步建议 */
function inferNextSuggested(stage, chapterStatus) {
  const suggestions = {
    S0: '完成情报收集，进入 S1 需求确认',
    S1: '确认需求和读者画像，进入 S2 大纲规划',
    S2: '完善大纲，进入 S3 章节写作',
    S3: chapterStatus.completedCount < chapterStatus.chapterCount
      ? `继续写作（已完成 ${chapterStatus.completedCount}/${chapterStatus.chapterCount} 章）`
      : '全章写作完成，进入 S4 质检',
    S4: '运行 S/P/C/B 四层质检，修订问题',
    S5: '完成去 AI 味处理和风格统一',
    S6: '生成最终交付物（MD/HTML/PDF）',
  };
  return suggestions[stage] || '继续当前阶段工作，或输入"福帮手"查看全部选项';
}

/**
 * 生成会话快照
 * @param {object} options
 * @param {string} [options.fbsDir]  .fbs 目录路径，默认 process.cwd()/.fbs
 * @param {boolean} [options.quiet]  静默模式，不输出 console.log
 * @returns {object} 快照对象
 */
export async function generateSessionSnapshot({ fbsDir, quiet = false } = {}) {
  const fbs = path.resolve(fbsDir || path.join(process.cwd(), '.fbs'));
  const esmStatePath = path.join(fbs, 'esm-state.md');
  const chapterStatusPath = path.join(fbs, 'chapter-status.md');
  const outPath = path.join(fbs, 'workbuddy-resume.json');

  const hasEsm = fs.existsSync(esmStatePath);
  const hasChapter = fs.existsSync(chapterStatusPath);
  const missingArtifacts = [];
  if (!hasEsm) missingArtifacts.push('esm-state.md');
  if (!hasChapter) missingArtifacts.push('chapter-status.md');

  let esmData = {};
  let chapterData = { chapterCount: 0, completedCount: 0, wordCount: 0, chapterCountSource: null };
  const cfgCanon = readProjectConfigCanonical(fbs);

  if (hasEsm) {
    try {
      esmData = parseEsmState(fs.readFileSync(esmStatePath, 'utf8'));
    } catch (e) {
      if (!quiet) console.warn('[snapshot] 读取 esm-state.md 失败:', e.message);
    }
  }

  if (hasChapter) {
    try {
      chapterData = parseChapterStatus(fs.readFileSync(chapterStatusPath, 'utf8'));
    } catch (e) {
      if (!quiet) console.warn('[snapshot] 读取 chapter-status.md 失败:', e.message);
    }
  }

  chapterData = clampChapterProgress(mergeChapterCountFromConfig(chapterData, cfgCanon));

  if (chapterData.wordCount <= 0 && cfgCanon.targetWordCount != null && cfgCanon.targetWordCount > 0) {
    chapterData.wordCount = cfgCanon.targetWordCount;
  }

  const stage = esmData.currentStage || 'S0';
  const titleFromBrief = tryReadBookTitleFromBrief(fbs);
  const titleFromConfig = cfgCanon.bookTitle;
  const snapshotSource =
    hasEsm && hasChapter ? 'esm+chapter' : hasEsm ? 'esm-only' : hasChapter ? 'chapter-only' : 'defaults-empty';

  const snapshot = {
    $schema: 'fbs-session-resume-v1',
    snapshotSource,
    missingArtifacts: missingArtifacts.length ? missingArtifacts : undefined,
    currentStage: stage,
    lastAction: esmData.lastAction || null,
    nextSuggested: inferNextSuggested(stage, chapterData),
    bookTitle: esmData.bookTitle || titleFromBrief || titleFromConfig || null,
    wordCount: chapterData.wordCount,
    chapterCount: chapterData.chapterCount,
    completedCount: chapterData.completedCount,
    chapterCountSource: chapterData.chapterCountSource || undefined,
    targetWordCount: cfgCanon.targetWordCount != null ? cfgCanon.targetWordCount : undefined,
    updatedAt: new Date().toISOString(),
  };

  try {
    writeJsonAtomic(fbs, 'workbuddy-resume.json', snapshot, { backup: true, quiet });
    if (!quiet) console.log(`[snapshot] 已写入 ${outPath}`);
  } catch (e) {
    if (!quiet) console.error('[snapshot] 写入失败:', e.message);
  }

  return snapshot;
}

// ── CLI 入口 ──
if (process.argv[1] && process.argv[1].endsWith('workbuddy-session-snapshot.mjs')) {
  const fbsDir = process.argv.includes('--fbs-dir')
    ? process.argv[process.argv.indexOf('--fbs-dir') + 1]
    : undefined;
  const quiet = process.argv.includes('--quiet');

  generateSessionSnapshot({ fbsDir, quiet }).then(snap => {
    if (!quiet) console.log('\n快照内容：');
    console.log(JSON.stringify(snap, null, 2));
  }).catch(err => {
    console.error('session-snapshot 失败:', err.message);
    process.exit(1);
  });
}
