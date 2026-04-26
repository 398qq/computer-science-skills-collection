/**
 * intake-router.mjs — FBS 主调度入口路由器（WorkBuddy / CodeBuddy 双通道）
 * FBS-BookWriter v2.1.0
 *
 * 设计目标：
 *   - 用统一的宿主快照指导入口动作
 *   - 恢复优先：优先读取 resume.json / chapter-status.md
 *   - 画像增强：检测到 WorkBuddy 画像时，为开场提供更贴合的建议
 *   - 自动补写恢复工件：host-capability / resume / session-resume-brief
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { adaptIntakeProtocol, extractUserProfile } from './workbuddy-user-profile-bridge.mjs';
import { SCENE_PACK_TIMEOUT_MS } from './intake-runtime-hooks.mjs';
import { appendTraceEvent } from './lib/fbs-trace-logger.mjs';
import { upsertBookSnippetIndex } from './lib/fbs-book-snippet-index.mjs';
import { detectHostCapability } from './host-capability-detect.mjs';
import { generateSessionSnapshot } from './workbuddy-session-snapshot.mjs';
import { applyBookMemoryTemplate } from './apply-book-memory-template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, '..');
const HOST_CACHE_TTL_MS = 60 * 60 * 1000;

function loadSkillRuntimeHints() {
  const p = path.join(SKILL_ROOT, 'fbs-runtime-hints.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--book-root' && argv[i + 1]) args.bookRoot = argv[++i];
    else if (argv[i] === '--intent' && argv[i + 1]) args.intent = argv[++i];
    else if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--enforce-required') args.enforceRequired = true;
    else if (argv[i] === '--fast') args.fast = true;
    else if (argv[i] === '--full') args.full = true;
    else if (argv[i] === '--search' && argv[i + 1]) args.search = argv[++i];
    else if (argv[i] === '--help') args.help = true;
  }
  return args;
}

export function readFreshHostCapability(hostCapCache) {
  if (!fs.existsSync(hostCapCache)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(hostCapCache, 'utf8'));
    const age = Date.now() - new Date(cached.detectedAt || 0).getTime();
    if (age < HOST_CACHE_TTL_MS) return cached;
  } catch {
    // ignore
  }
  return null;
}

function buildProfileContext(hostCap) {
  const workbuddyHome = hostCap?.workbuddy?.homeDir;
  if (!workbuddyHome || hostCap?.hostType !== 'workbuddy') return { profile: null, intakeProfile: null };

  try {
    const profile = extractUserProfile(workbuddyHome);
    const intakeProfile = adaptIntakeProtocol(profile);
    return { profile, intakeProfile };
  } catch {
    return { profile: null, intakeProfile: null };
  }
}

function readResumeCard(resolvedFbsDir) {
  const resumePath = path.join(resolvedFbsDir, 'workbuddy-resume.json');
  if (!fs.existsSync(resumePath)) return null;
  try {
    const card = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
    const chapterCount = Number(card.chapterCount) || 0;
    let completedCount = Number(card.completedCount) || 0;
    if (chapterCount > 0) {
      completedCount = Math.min(completedCount, chapterCount);
    }
    return {
      path: resumePath,
      bookTitle: card.bookTitle || null,
      currentStage: card.currentStage || null,
      wordCount: card.wordCount || 0,
      targetWordCount: card.targetWordCount != null ? Number(card.targetWordCount) : null,
      chapterCount,
      completedCount,
      nextSuggested: card.nextSuggested || null,
      updatedAt: card.updatedAt || null,
    };
  } catch {
    return null;
  }
}

/**
 * 在起始目录下做有限深度扫描，查找含 `.fbs/chapter-status.md` 的书稿根（P1-01 跨目录发现）
 */
function findNestedBookRootWithChapterStatus(startDir, maxDepth, maxNodes) {
  const start = path.resolve(startDir);
  const queue = [{ dir: start, depth: 0 }];
  const seen = new Set();
  let nodes = 0;
  while (queue.length && nodes < maxNodes) {
    const { dir, depth } = queue.shift();
    if (seen.has(dir)) continue;
    seen.add(dir);
    nodes += 1;
    const marker = path.join(dir, '.fbs', 'chapter-status.md');
    if (fs.existsSync(marker)) return dir;
    if (depth >= maxDepth) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (ent.name === 'node_modules') continue;
      if (ent.name.startsWith('.') && ent.name !== '.') continue;
      queue.push({ dir: path.join(dir, ent.name), depth: depth + 1 });
    }
  }
  return null;
}

function resolveEffectiveBookRoot(resolvedBookRoot) {
  const rootFbs = path.join(resolvedBookRoot, '.fbs');
  if (fs.existsSync(rootFbs)) {
    return { effectiveBookRoot: resolvedBookRoot, subDirBookRoot: null };
  }

  try {
    const entries = fs.readdirSync(resolvedBookRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const subFbs = path.join(resolvedBookRoot, entry.name, '.fbs', 'chapter-status.md');
      if (fs.existsSync(subFbs)) {
        return {
          effectiveBookRoot: path.join(resolvedBookRoot, entry.name),
          subDirBookRoot: path.join(resolvedBookRoot, entry.name),
        };
      }
    }
  } catch {
    // ignore
  }

  const nested = findNestedBookRootWithChapterStatus(resolvedBookRoot, 2, 48);
  if (nested) {
    return { effectiveBookRoot: nested, subDirBookRoot: nested };
  }

  return { effectiveBookRoot: resolvedBookRoot, subDirBookRoot: null };
}

function hasMemoryBriefSource(effectiveBookRoot, effectiveFbsDir) {
  return [
    path.join(effectiveFbsDir, 'chapter-status.md'),
    path.join(effectiveFbsDir, 'workbuddy-resume.json'),
    path.join(effectiveFbsDir, 'smart-memory', 'memory.json'),
    path.join(effectiveFbsDir, 'book-context-brief.md'),
    path.join(effectiveBookRoot, 'GLOSSARY.md'),
  ].some((file) => fs.existsSync(file));
}

async function ensureRuntimeArtifacts(resolvedBookRoot, effectiveBookRoot, effectiveFbsDir) {
  const hostCapCache = path.join(effectiveFbsDir, 'host-capability.json');
  let hostCap = readFreshHostCapability(hostCapCache);
  let hostCapabilityAutoRefreshed = false;
  let hostCapabilityError = null;

  if (!hostCap) {
    try {
      hostCap = await detectHostCapability({
        bookRoot: effectiveBookRoot,
        skillRoot: SKILL_ROOT,
        fbsDir: effectiveFbsDir,
      });
      hostCapabilityAutoRefreshed = true;
    } catch (error) {
      hostCapabilityError = error.message;
    }
  }

  const chapterStatus = path.join(effectiveFbsDir, 'chapter-status.md');
  const esmState = path.join(effectiveFbsDir, 'esm-state.md');
  const resumeJson = path.join(effectiveFbsDir, 'workbuddy-resume.json');
  const memoryBrief = path.join(effectiveFbsDir, 'smart-memory', 'session-resume-brief.md');

  let resumeSnapshotRegenerated = false;
  let memoryBriefRegenerated = false;
  const artifactErrors = [];

  if (!fs.existsSync(resumeJson) && (fs.existsSync(chapterStatus) || fs.existsSync(esmState))) {
    try {
      await generateSessionSnapshot({ fbsDir: effectiveFbsDir, quiet: true });
      resumeSnapshotRegenerated = fs.existsSync(resumeJson);
      if (!resumeSnapshotRegenerated) artifactErrors.push('恢复卡补写后仍未生成 workbuddy-resume.json');
    } catch (error) {
      artifactErrors.push(`恢复卡补写失败：${error.message}`);
    }
  }

  if (!fs.existsSync(memoryBrief) && hasMemoryBriefSource(effectiveBookRoot, effectiveFbsDir)) {
    try {
      applyBookMemoryTemplate({ bookRoot: effectiveBookRoot, quiet: true });
      memoryBriefRegenerated = fs.existsSync(memoryBrief);
      if (!memoryBriefRegenerated) artifactErrors.push('会话摘要补写后仍未生成 session-resume-brief.md');
    } catch (error) {
      artifactErrors.push(`会话摘要补写失败：${error.message}`);
    }
  }

  const { profile, intakeProfile } = buildProfileContext(hostCap);

  return {
    hostCap,
    hostCapabilityAutoRefreshed,
    hostCapabilityError,
    resumeSnapshotRegenerated,
    memoryBriefRegenerated,
    artifactErrors,
    profile,
    intakeProfile,
  };
}

export async function detectEnv(resolvedBookRoot, opts = {}) {
  const intakeFast = !!opts.fast;
  const { effectiveBookRoot, subDirBookRoot } = resolveEffectiveBookRoot(resolvedBookRoot);
  const effectiveFbsDir = path.join(effectiveBookRoot, '.fbs');
  const hadFbsBeforeInit = fs.existsSync(effectiveFbsDir);

  const runtime = await ensureRuntimeArtifacts(resolvedBookRoot, effectiveBookRoot, effectiveFbsDir);

  let runtimeHooks = {
    esmGenreSynced: false,
    scenePackId: 'general',
    scenePackLoaded: false,
    registerBookAttempted: false,
    notes: [],
    errors: [],
  };
  if (fs.existsSync(effectiveFbsDir)) {
    try {
      const { maybeSyncEsmGenreAndScenePack } = await import('./intake-runtime-hooks.mjs');
      runtimeHooks = await maybeSyncEsmGenreAndScenePack(effectiveBookRoot, effectiveFbsDir, {
        quiet: true,
        fast: intakeFast,
      });
    } catch (error) {
      runtimeHooks.errors.push(`runtime-hooks: ${error.message}`);
    }
  }

  const chapterStatus = path.join(effectiveFbsDir, 'chapter-status.md');
  const resumeJson = path.join(effectiveFbsDir, 'workbuddy-resume.json');
  const memoryBrief = path.join(effectiveFbsDir, 'smart-memory', 'session-resume-brief.md');
  const resumeCard = readResumeCard(effectiveFbsDir);

  const hasProjectArtifacts = [
    chapterStatus,
    resumeJson,
    memoryBrief,
    path.join(effectiveFbsDir, 'book-context-brief.md'),
    path.join(effectiveBookRoot, 'deliverables'),
    path.join(effectiveBookRoot, 'releases'),
  ].some((target) => fs.existsSync(target));

  return {
    bookRoot: resolvedBookRoot,
    effectiveBookRoot,
    fbsDir: effectiveFbsDir,
    hadFbsBeforeInit,
    hasFbs: fs.existsSync(effectiveFbsDir),
    hasProjectArtifacts,
    hasChapterStatus: fs.existsSync(chapterStatus),
    hasResumeJson: fs.existsSync(resumeJson),
    hasMemoryBrief: fs.existsSync(memoryBrief),
    subDirBookRoot,
    hostCap: runtime.hostCap,
    hostCapabilityAutoRefreshed: runtime.hostCapabilityAutoRefreshed,
    hostCapabilityError: runtime.hostCapabilityError,
    resumeSnapshotRegenerated: runtime.resumeSnapshotRegenerated,
    memoryBriefRegenerated: runtime.memoryBriefRegenerated,
    artifactErrors: runtime.artifactErrors,
    profile: runtime.profile,
    intakeProfile: runtime.intakeProfile,
    resumeCard,
    runtimeHooks,
    intakeFast,
  };
}

export function resolveIntent(intent, env) {
  if (intent !== 'auto') return intent;
  if (env.hasChapterStatus || env.hasResumeJson || env.subDirBookRoot) return 'resume';
  return 'new-session';
}

function formatRoutingModeLabel(mode) {
  const m = String(mode || '').trim();
  if (m === 'hybrid') return '双轨';
  if (m === 'workbuddy_only' || m === 'workbuddy') return 'WorkBuddy';
  if (m === 'codebuddy_only' || m === 'codebuddy') return 'CodeBuddy';
  return m || '—';
}

function pushHostInfo(info, hostCap) {
  if (!hostCap) return;
  info.push(`宿主模式：${formatRoutingModeLabel(hostCap.routingMode)}（原始值 ${hostCap.routingMode || '—'}，对用户的说明请用人话转述）`);

  if (hostCap.tier1?.marketplaceSummary) {
    info.push(
      `本地市场增强技能概览：${hostCap.tier1.marketplaceSummary} 项已装或可探测（未装全时按宿主能力降级，属正常）`,
    );
  }

  const tier1Available = hostCap.tier1?.relevantSkills?.available || [];
  if (tier1Available.length > 0) {
    info.push(`本地市场可用增强技能（节选）：${tier1Available.slice(0, 6).join('、')}`);
  }

  const enabledPlugins = hostCap.plugins?.available || [];
  if (enabledPlugins.length > 0) {
    info.push(`已启用插件：${enabledPlugins.join('、')}`);
  }
}

function formatWordCountCn(n) {
  const x = Number(n) || 0;
  if (x <= 0) return null;
  if (x >= 10000) {
    const w = x / 10000;
    const rounded = Math.round(w * 10) / 10;
    if (rounded >= 100) return `${Math.round(w)}万字`;
    return `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)}万字`;
  }
  return `${x}字`;
}

/** 终端用户只看这一行（+3 个选项），勿堆 intake 全文 JSON / SKILL 规范（WorkBuddy 实测 P0-1） */
function buildUserFacingOneLiner(env) {
  const r = env.resumeCard;
  const fbsLine = env.hasFbs ? '书稿目录已就绪' : '书稿目录尚未初始化虚拟书房';
  if (r && (r.bookTitle || r.wordCount > 0 || r.targetWordCount > 0 || r.currentStage || r.chapterCount > 0)) {
    const title = (r.bookTitle && String(r.bookTitle).trim()) || '书稿';
    const wcNum = Math.max(Number(r.wordCount) || 0, Number(r.targetWordCount) || 0);
    const wc = formatWordCountCn(wcNum);
    const st = r.currentStage || '—';
    const nch = Number(r.chapterCount) || 0;
    const ndoneRaw = Number(r.completedCount) || 0;
    const ndone = nch > 0 ? Math.min(ndoneRaw, nch) : ndoneRaw;
    const chPart = nch > 0 ? `，进度约 ${ndone}/${nch} 章` : '';
    const wcPart = wc ? `约${wc}` : '';
    const core = [wcPart, `${st}${chPart}`].filter(Boolean).join('，');
    return `${title}已就绪（${core}）。这次想做什么？`;
  }
  return `福帮手已就绪，${fbsLine}。这次想做什么？`;
}

function buildFirstResponseContext(env) {
  const cap = env.hostCap;
  const plugins = cap?.plugins?.enabled?.length ? cap.plugins.enabled : cap?.plugins?.available || [];
  const routingLabel = formatRoutingModeLabel(cap?.routingMode);
  const fbsLine = env.hasFbs ? '书稿目录已就绪' : '书稿目录尚未初始化虚拟书房';
  const artifactLine = env.hasProjectArtifacts ? '检测到可续写的进度或素材线索' : '当前位置暂无可直接续写的书房台账，将进入轻量引导';
  /** 对用户转述用人话，勿照搬 Tier/插件代号；2026-04-13 WorkBuddy 实测：首屏忌冗长菜单（P0-1） */
  const recommendedOneLiner = `福帮手已就绪（${routingLabel}）。${fbsLine}；${artifactLine}。首句只问「要做什么？」并最多给 3 个主选项：写新书、接着写、质检或整理素材；需要更多时再展开「其他」。勿首屏平铺 5 条以上同级选项。`;
  const userFacingOneLiner = buildUserFacingOneLiner(env);
  const openingGuidance = {
    firstScreenQuestion: '这次想做什么？',
    maxPrimaryOptions: 3,
    primaryOptionsHint: ['写新书（或新建书稿）', '接着写（恢复上次）', '质检或整理素材'],
    deferFullMenuTo: '用户说「其他」或需要时再展开完整能力列表',
    batchConfirmHint:
      '需求信息收齐后优先「一次性汇总确认 + 用户说开始再分步执行」，避免连续多轮只让用户选「下一步选哪个」',
    /** 宿主侧：向用户只展示 userFacingOneLiner，不要把 intake JSON / SKILL 全文注入对话区 */
    hostInjectionContract: {
      showToUser: ['userFacingOneLiner', '最多3个主选项'],
      doNotShowToUser: [
        '完整 intake-router JSON',
        'SKILL 全文',
        'references 长文档',
        '元指令/自检口令（如「按 v* 规范」「JSON 输出」「不重复读文件」「干净首屏」等复述）',
      ],
    },
  };
  return {
    $schema: 'fbs-first-response-context-v1',
    hostType: cap?.hostType || null,
    routingMode: cap?.routingMode || null,
    fbsInitialized: !!env.hasFbs,
    hasProjectArtifacts: !!env.hasProjectArtifacts,
    pluginsEnabled: plugins.slice(0, 20),
    tier1MarketplaceSummary: cap?.tier1?.marketplaceSummary || null,
    binaryToolchain: cap?.binaryToolchain || null,
    workbuddyGenieVersion: cap?.workbuddyGenieVersion || null,
    recommendedOneLiner,
    userFacingOneLiner,
    openingGuidance,
  };
}

/** 不向 Agent warnings 堆栈原始 remote_error 技术细节（实测 P1-02） */
function sanitizeHookErrorMessage(message) {
  const s = String(message || '');
  if (/remote_error|场景包\/乐包钩子失败|__FBS_SCENE_PACK_TIMEOUT__|超时降级/.test(s)) {
    return '场景包在线链路未完全成功，已按本地规则与乐包埋点继续（细节见 JSON runtimeHooks）';
  }
  // WorkBuddy 实测：Windows / PowerShell 下缺少 Unix 命令（如 head）时向用户转述为人话（P1-3）
  if (/\bhead\b/i.test(s) && /(not found|not recognized|找不到|CommandNotFound|不是内部或外部命令)/i.test(s)) {
    return '当前终端环境与部分脚本期望不一致（例如缺少 Unix 风格命令），已跳过或改用内置方案；若反复出现，可在宿主设置中改用 Git Bash/WSL 或检查 PATH。';
  }
  if (/CommandNotFoundException|不是内部或外部命令/i.test(s) && s.length < 240) {
    return '检测到环境命令不可用，已尽力降级或跳过该步；若影响功能，请检查宿主终端与 PATH 配置。';
  }
  return s;
}

function buildProfileSuggestion(env, required = false) {
  if (!env.intakeProfile?.customGreeting) return null;
  return {
    step: 0,
    label: '按 WorkBuddy 画像开场',
    action: `优先使用这样的开场方式：${env.intakeProfile.customGreeting}`,
    reason: '检测到宿主画像，可减少重复背景收集',
    required,
  };
}

export function buildRecommendations(intent, env) {
  const eb = env.effectiveBookRoot;
  const actions = [];
  const warnings = [];
  const info = [];
  const blockers = [];

  if (env.runtimeHooks?.errors?.length) {
    env.runtimeHooks.errors.forEach((message) => warnings.push(sanitizeHookErrorMessage(message)));
  }
  if (env.runtimeHooks?.notes?.length) {
    env.runtimeHooks.notes.forEach((message) => info.push(message));
  }

  if (env.subDirBookRoot) {
    info.push(`在子目录 "${path.basename(env.subDirBookRoot)}" 中找到书房，已切换 bookRoot 为该目录`);
  }

  if (env.hostCapabilityError) {
    blockers.push({
      code: 'host_capability_failed',
      message: `宿主检测失败：${env.hostCapabilityError}`,
    });
    actions.push({
      step: 1,
      label: '重试宿主环境检测',
      cmd: `node scripts/host-capability-detect.mjs --book-root "${eb}" --json --force`,
      reason: '需先恢复 host-capability.json，才能进入标准入口路由',
      required: true,
    });
  } else if (env.hostCapabilityAutoRefreshed) {
    info.push('已自动执行宿主环境检测并刷新 host-capability.json');
  }

  if (env.resumeSnapshotRegenerated) {
    info.push('已自动补写 .fbs/workbuddy-resume.json');
  }
  if (env.memoryBriefRegenerated) {
    info.push('已自动补写 .fbs/smart-memory/session-resume-brief.md');
  }
  env.artifactErrors.forEach((message) => warnings.push(message));

  if (env.hostCap) {
    pushHostInfo(info, env.hostCap);
  }

  if (env.profile?.isProfileComplete) {
    const displayName = env.profile.basicInfo.callName || env.profile.basicInfo.name;
    const currentProject = env.profile.workContext.currentProject || '当前项目';
    info.push(`已载入 WorkBuddy 用户画像：${displayName} / ${currentProject}`);
  }

  if (env.resumeCard?.updatedAt) {
    info.push(`已读取恢复卡快照：${env.resumeCard.updatedAt}`);
  }

  switch (intent) {
    case 'new-session': {
      if (!env.hasProjectArtifacts) {
        warnings.push('当前目录暂无可恢复书房记录，将进入 S0.5 轻量引导');
      }
      const profileAction = buildProfileSuggestion(env, !env.hasProjectArtifacts);
      if (profileAction) {
        profileAction.step = actions.length + 1;
        actions.push(profileAction);
      }
      actions.push({
        step: actions.length + 1,
        label: '新手引导（S0.5）',
        action: env.intakeProfile?.customGreeting
          ? `先说“${env.intakeProfile.customGreeting}”，再引导用户说明这次要继续旧项目还是开始新项目`
          : '向用户说“你想做什么？随便说说就行——写书、整理材料、还是先看看能做什么都可以”',
        reason: '先以自然语言确认目标，再进入虚拟书房初始化或续写',
        required: true,
      });
      if (env.intakeProfile?.customQuestions?.length > 0) {
        actions.push({
          step: actions.length + 1,
          label: '使用画像增强提问',
          action: `优先参考这些问题：${env.intakeProfile.customQuestions.slice(0, 3).join('；')}`,
          reason: '减少重复问答，优先沿着既有偏好继续',
          required: false,
        });
      }
      break;
    }

    case 'resume': {
      if (!env.hasResumeJson && env.hasChapterStatus) {
        blockers.push({
          code: 'missing_resume_snapshot',
          message: '缺少标准恢复卡 `.fbs/workbuddy-resume.json`，且自动补写未成功；续写前必须先生成恢复卡快照。',
        });
        actions.push({
          step: actions.length + 1,
          label: '生成恢复卡快照',
          cmd: `node scripts/workbuddy-session-snapshot.mjs --fbs-dir "${env.fbsDir}" --quiet`,
          reason: '缺少 `.fbs/workbuddy-resume.json`，需先生成标准恢复卡再进入续写',
          required: true,
        });
      }

      const resumeFile = env.hasResumeJson
        ? path.join(env.fbsDir, 'workbuddy-resume.json')
        : path.join(env.fbsDir, 'chapter-status.md');

      actions.push({
        step: actions.length + 1,
        label: '读取进度台账',
        cmd: `read_file "${resumeFile}"`,
        reason: '获取书名、当前章节、上次断点',
        required: true,
      });

      if (env.hasMemoryBrief) {
        actions.push({
          step: actions.length + 1,
          label: '读取记忆摘要',
          cmd: `read_file "${path.join(env.fbsDir, 'smart-memory', 'session-resume-brief.md')}"`,
          reason: '恢复风格、术语锁定等跨会话上下文',
          required: true,
        });
      } else {
        warnings.push('未找到 session-resume-brief.md，将按章节台账 + 恢复卡继续');
      }

      if (env.profile?.isProfileComplete) {
        actions.push({
          step: actions.length + 1,
          label: '应用 WorkBuddy 用户画像',
          action: `优先沿用默认模式：${env.intakeProfile?.defaultMode || '当前画像模式'}；默认协作：${env.intakeProfile?.defaultCollaboration || '当前画像协作方式'}`,
          reason: '恢复卡和宿主画像一起使用，减少重复确认',
          required: false,
        });
      }

      actions.push({
        step: actions.length + 1,
        label: '向用户输出恢复卡',
        action: '说明书名、当前章节、已完成字数、建议下一步，直接告知，不追问背景',
        required: true,
      });
      break;
    }

    case 'edit':
      warnings.push('编辑模式：每轮最多处理 2 个文件，处理前先向用户确认文件清单');
      actions.push({
        step: actions.length + 1,
        label: '快速扫描可改项',
        cmd: `powershell -ExecutionPolicy Bypass -File scripts/quick-scan.ps1 -BookRoot "${eb}"`,
        cmdAlt: `node scripts/quality-auditor-lite.mjs --book-root "${eb}" --standalone`,
        reason: '了解哪些章节有问题，优先改高风险项，避免盲目全量读取',
        required: false,
        tip: '若用户已明确指定文件，跳过此步直接操作',
      });
      actions.push({
        step: actions.length + 1,
        label: '向用户确认修改范围',
        action: '列出“本次建议修改的文件（最多 2 个）”，等用户确认后再 read_file',
        required: true,
      });
      actions.push({
        step: actions.length + 1,
        label: '串行修改（1 文件完成后再处理下一个）',
        action: '修改前说明“我接下来修改 [文件名]，改 [N 处]，大概需要 [X 秒]”',
        required: true,
      });
      actions.push({
        step: actions.length + 1,
        label: 'S3 记忆检测点',
        action: '完成修改后调用 update_memory，写入：书名、章节、字数、风格要点、术语锁定列表',
        required: true,
      });
      break;

    case 'qc':
      actions.push({
        step: actions.length + 1,
        label: '质量审计（轻量版）',
        cmd: `node scripts/quality-auditor-lite.mjs --book-root "${eb}" --standalone`,
        reason: '快速扫描 S/P/C/B 层问题',
        required: true,
      });
      actions.push({
        step: actions.length + 1,
        label: '（可选）全景质检',
        cmd: `node scripts/quality-panorama-orchestrator.mjs --skill-root "${SKILL_ROOT}" --book-root "${eb}" --mode auto`,
        reason: '文件数 > 50 时推荐',
        required: false,
      });
      break;

    case 'init':
      actions.push({
        step: actions.length + 1,
        label: '初始化虚拟书房底座',
        cmd: `node scripts/init-fbs-multiagent-artifacts.mjs --book-root "${eb}"`,
        reason: '创建 .fbs/ deliverables/ releases/ 三层目录及基础工件',
        required: true,
      });
      break;

    case 'inspect':
      actions.push({
        step: actions.length + 1,
        label: '查看项目概况',
        cmd: `node scripts/workspace-inspector.mjs --book-root "${eb}"`,
        required: false,
        cmdAlt: `node scripts/verify-chapter-status-truth.mjs --book-root "${eb}"`,
      });
      if (env.hasChapterStatus) {
        actions.push({
          step: actions.length + 1,
          label: '读取章节台账',
          cmd: `read_file "${path.join(env.fbsDir, 'chapter-status.md')}"`,
          required: true,
        });
      }
      break;

    case 'exit':
      if (!env.hasProjectArtifacts) {
        warnings.push('当前未检测到完整书稿台账；退出时将写入最小恢复信息，便于下次继续。');
      }
      actions.push({
        step: actions.length + 1,
        label: '安全退出并写入恢复摘要',
        cmd: `node scripts/session-exit.mjs --book-root "${eb}" --json`,
        reason: '默认先保存恢复卡与会话摘要，再安全退出当前会话',
        required: true,
      });
      actions.push({
        step: actions.length + 1,
        label: '向用户确认已记录',
        action: '回复“已记录当前状态。下次输入『福帮手』可从上次位置继续。”；若用户明确要求不保存，再只确认退出。',
        required: true,
      });
      break;
  }

  const mustRunBeforeContinue = actions
    .filter((action) => action.required)
    .map(({ step, label, cmd, action }) => ({ step, label, cmd: cmd || null, action: action || null }));

  const skillRuntimeHints = loadSkillRuntimeHints();
  const t1 = env.hostCap?.tier1;

  return {
    intent,
    intakeRouterRunAt: new Date().toISOString(),
    compliance: {
      intakeRouterExecuted: true,
      architectureNote:
        'Skill 仅注入文档上下文时，不会自动执行本脚本；须由主 Agent 显式运行 node scripts/intake-router.mjs（audit P0-01）。宿主宜在注入技能后的首轮校验本字段或 JSON 顶层 intent 已产出，未执行则不得宣称「已进入福帮手工作流」。',
      exitReminder:
        '用户说退出/停止/退出福帮手时，须先运行 node scripts/session-exit.mjs --book-root <bookRoot> --json 并复述完整 userMessage（含第二行摘要）（audit P0-02 / P1-04）',
    },
    runtimeHooks: env.runtimeHooks || null,
    env: {
      bookRoot: eb,
      hasFbs: env.hasFbs,
      hadFbsBeforeInit: env.hadFbsBeforeInit,
      hasProjectArtifacts: env.hasProjectArtifacts,
      subDirFound: !!env.subDirBookRoot,
      hostType: env.hostCap?.hostType || null,
      routingMode: env.hostCap?.routingMode || null,
    },
    readyToProceed: blockers.length === 0,
    blockers,
    mustRunBeforeContinue,
    resumeCard: env.resumeCard || null,
    actions,
    warnings,
    info,
    skillRuntimeHints,
    tier1Marketplace: t1
      ? {
          summary: t1.marketplaceSummary,
          availableCount: t1.relevantSkills?.available?.length ?? 0,
          totalCount: t1.relevantSkills?.checked?.length ?? 0,
          note: t1.marketplaceSummaryNote,
        }
      : null,
    searchPreflightContractRelative: 'references/05-ops/search-preflight-contract.json',
    scriptBridgeDoc: 'references/01-core/skill-cli-bridge-matrix.md',
    scriptBridgeCli: 'scripts/fbs-cli-bridge.mjs',
    firstResponseContext: buildFirstResponseContext(env),
    performance: {
      intakeFast: !!env.intakeFast,
      scenePackSkippedFast: !!env.runtimeHooks?.scenePackSkippedFast,
      scenePackTimedOut: !!env.runtimeHooks?.scenePackTimedOut,
      scenePackTimeoutMs: env.intakeFast ? null : SCENE_PACK_TIMEOUT_MS,
      hostMemoryFilesCap: 24,
      hint: env.intakeFast
        ? '默认快速开场：已跳过场景包全量联网加载；需要完整在线场景包时请对 intake-router 显式加 --full。'
        : '已使用 --full：将尝试完整加载场景包（可能较慢）；一般开场请去掉 --full 以启用默认快速模式。',
    },
    strategies: {
      A_truthAndContracts: 'references/01-core/memory-layer-matrix.md',
      B_hostAugmentation: 'references/05-ops/teams-inbox-mapping.md',
      C_evolution: 'references/05-ops/lexicon-governance.md',
    },
  };
}

export function formatOutput(result, useJson) {
  if (useJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const C = {
    cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', bold: '\x1b[1m', reset: '\x1b[0m',
  };

  console.log(`\n${C.bold}${C.cyan}═══ FBS 入口路由器 v2.1.0（WorkBuddy / CodeBuddy 双通道）═══${C.reset}\n`);

  console.log(`${C.bold}书根路径：${C.reset}${result.env.bookRoot}`);
  console.log(`${C.bold}意图判断：${C.reset}${result.intent}`);
  if (result.env.routingMode) {
    console.log(`${C.bold}宿主模式：${C.reset}${result.env.routingMode}`);
  }

  if (result.info.length > 0) {
    result.info.forEach(i => console.log(`${C.cyan}  ℹ  ${i}${C.reset}`));
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.log(`${C.yellow}  ⚠  ${w}${C.reset}`));
  }
  if (result.blockers.length > 0) {
    console.log(`\n${C.bold}${C.red}阻断项：${C.reset}`);
    result.blockers.forEach((blocker) => console.log(`  ✖ [${blocker.code}] ${blocker.message}`));
  }

  const oneLiner = result.firstResponseContext?.recommendedOneLiner;
  if (oneLiner) {
    console.log(`\n${C.bold}首响要点（向用户转述时用人话，勿照搬内部代号）：${C.reset}`);
    console.log(`  ${oneLiner}`);
  }
  if (result.performance?.hint) {
    console.log(`${C.cyan}  ℹ  ${result.performance.hint}${C.reset}`);
  }

  if (result.runtimeHooks) {
    const rh = result.runtimeHooks;
    console.log(`\n${C.bold}运行时钩子（ESM/场景包/乐包）：${C.reset}`);
    console.log(`  体裁等级已对齐：${rh.esmGenreSynced ? '是' : '否'}；场景包：${rh.scenePackId}；已加载：${rh.scenePackLoaded ? '是' : '否'}`);
  }
  if (result.compliance?.architectureNote) {
    console.log(`\n${C.cyan}  ℹ  合规提示：${result.compliance.architectureNote}${C.reset}`);
  }
  if (result.scriptBridgeDoc) {
    console.log(
      `\n${C.bold}脚本联动：${C.reset}${result.scriptBridgeCli}（help） · 文档 ${result.scriptBridgeDoc}`,
    );
  }

  console.log(
    `\n${C.bold}入口状态：${C.reset} ${
      result.readyToProceed
        ? `${C.green}可继续（无阻断项）${C.reset}`
        : `${C.yellow}需先处理阻断项或必做步骤${C.reset}`
    }`,
  );

  if (result.resumeCard) {
    console.log(`\n${C.bold}恢复卡快照：${C.reset}`);
    console.log(`  书名：${result.resumeCard.bookTitle || '—'}`);
    console.log(`  当前阶段：${result.resumeCard.currentStage || '—'}`);
    console.log(`  章节进度：${result.resumeCard.completedCount || 0}/${result.resumeCard.chapterCount || 0}`);
    console.log(`  当前字数：${result.resumeCard.wordCount || 0}`);
    if (result.resumeCard.nextSuggested) {
      console.log(`  下一步：${result.resumeCard.nextSuggested}`);
    }
  }

  console.log(`\n${C.bold}推荐执行动作：${C.reset}`);

  result.actions.forEach(a => {
    const req = a.required ? `${C.red}[必做]${C.reset}` : `${C.cyan}[可选]${C.reset}`;
    console.log(`\n  ${C.bold}Step ${a.step}：${a.label}${C.reset} ${req}`);
    if (a.cmd) console.log(`    命令：${a.cmd}`);
    if (a.cmdAlt) console.log(`    备用：${a.cmdAlt}`);
    if (a.action) console.log(`    操作：${a.action}`);
    if (a.reason) console.log(`    ${C.cyan}原因：${a.reason}${C.reset}`);
    if (a.tip) console.log(`    ${C.yellow}提示：${a.tip}${C.reset}`);
  });

  console.log(`\n${C.bold}使用说明：${C.reset}`);
  console.log('  AI 请按 Step 顺序执行“必做”动作，“可选”动作根据实际情况决定。');
  console.log(`  当前入口状态：${result.readyToProceed ? 'ready' : 'blocked'}。`);
  console.log('  完成所有必做动作后，再根据用户意图进入具体写作/质检/交付流程。\n');
}

export async function runIntakeRouter({ bookRoot = process.cwd(), intent = 'auto', fast = true } = {}) {
  const env = await detectEnv(path.resolve(bookRoot), { fast });
  const resolvedIntent = resolveIntent(intent, env);
  return buildRecommendations(resolvedIntent, env);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`
intake-router.mjs — FBS 主调度入口路由器 v2.1.0（WorkBuddy / CodeBuddy 双通道）

用法：
  node scripts/intake-router.mjs --book-root <bookRoot> --intent <intent> [--json] [--enforce-required] [--fast] [--full]
           [--search <关键词>]

  默认启用快速开场（等同 --fast）：跳过场景包全量联网加载，仅乐包 registerBook，首响更快。
  --full   显式请求完整场景包加载（可能较慢，网络差时慎用）
  --fast   与默认相同，可省略（保留兼容旧脚本）
  --search 在 ~/.workbuddy/fbs-book-projects.json 索引中按书名/路径关键词检索历史书稿目录（需曾成功执行过 session-exit）

intent 可选值：
  auto        自动检测（默认）
  new-session 新会话开场
  edit        修改/扩充/升级书稿
  qc          质量自检/去AI味
  resume      续写/继续上次
  init        初始化书房
  inspect     查看项目状态
  exit        安全退出并写入恢复摘要
`);
    process.exit(0);
  }

  const bookRoot = args.bookRoot ? path.resolve(args.bookRoot) : process.cwd();
  const intentArg = args.intent || 'auto';
  const jsonMode = args.json || false;
  const intakeFast = args.full ? false : true;

  const result = await runIntakeRouter({ bookRoot, intent: intentArg, fast: intakeFast });
  if (args.search && String(args.search).trim()) {
    const { searchUnifiedBookRoots } = await import('./lib/fbs-book-snippet-index.mjs');
    const kw = String(args.search).trim();
    const matches = searchUnifiedBookRoots(kw);
    result.bookProjectSearch = {
      keyword: kw,
      matches,
      hint: matches.length
        ? '以下为登记 + 本书关键词索引命中的书稿目录，可请用户确认后作为 --book-root 使用'
        : '索引中暂无匹配；用户完成一次正常退出后会自动登记书稿路径',
    };
    if (matches.length) {
      result.info.push(`书名/路径索引命中 ${matches.length} 条（详见 bookProjectSearch.matches）`);
    }
  }
  formatOutput(result, jsonMode);

  try {
    upsertBookSnippetIndex(result.env?.bookRoot || bookRoot);
  } catch {
    /* ignore */
  }

  appendTraceEvent({
    bookRoot,
    skillRoot: SKILL_ROOT,
    script: 'intake-router.mjs',
    event: 'intake_router',
    exitCode: args.enforceRequired && !result.readyToProceed ? 1 : 0,
    payloadSummary: {
      intent: result.intent,
      readyToProceed: result.readyToProceed,
      intakeFast,
      searchKeyword: args.search || null,
    },
  });

  if (args.enforceRequired && !result.readyToProceed) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('intake-router.mjs')) {
  main().catch((error) => {
    console.error(`intake-router 失败: ${error.message}`);
    process.exit(1);
  });
}
