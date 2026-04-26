#!/usr/bin/env node
/**
 * 校验 fbs-runtime-hints.json：必填键、类型、引用的相对路径文件是否存在。
 * 用于 pack:skill-gates / CI，防止机读约定漂移。
 *
 * 维护约定：若在 fbs-runtime-hints.json 增加新的「文档/产物路径」型顶层块或字段，
 * 请同步更新本文件的 REQUIRED_TOP 与 PATH_CHECKS，并运行
 * `node scripts/validate-runtime-hints.mjs --skill-root <根>` 确认路径存在。
 * scriptsManifest（generated）在干净仓库中需先 `npm run manifest:scripts` 再校验。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_TOP = [
  'version',
  'session',
  's3',
  'search',
  'compliance',
  'hostMemory',
  'userExperience',
  'antiStall',
  'orchestration',
  'strategiesABC',
  'scriptBridge',
  'trace',
  'bookIndex',
  'evolutionGate',
  'contextCompression',
  'auxiliaryTasks',
  'hostPresentation',
];

const PATH_CHECKS = [
  ['search', 'preflightContractPath'],
  ['userExperience', 'rulesCenter'],
  ['userExperience', 'dialogLayer'],
  ['userExperience', 'agentPlaybook'],
  ['antiStall', 'guide'],
  ['orchestration', 'strategyDoc'],
  ['orchestration', 'multiAgentSyncDoc'],
  ['strategiesABC', 'docMatrix'],
  ['scriptBridge', 'matrixDoc'],
  ['scriptBridge', 'primaryCli'],
  ['trace', 'schemaPath'],
  ['evolutionGate', 'scriptsManifest'],
  ['evolutionGate', 'improvementDoc'],
  ['contextCompression', 'policyDoc'],
  ['auxiliaryTasks', 'tasksDoc'],
  ['hostPresentation', 'integrationDoc'],
];

function parseArgs(argv) {
  const o = { skillRoot: path.resolve(__dirname, '..'), help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--skill-root' && argv[i + 1]) o.skillRoot = path.resolve(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') o.help = true;
  }
  return o;
}

export function validateRuntimeHints(skillRoot) {
  const root = path.resolve(skillRoot);
  const hintsPath = path.join(root, 'fbs-runtime-hints.json');
  const errors = [];

  if (!fs.existsSync(hintsPath)) {
    return { ok: false, errors: [`缺少 ${hintsPath}`] };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(hintsPath, 'utf8'));
  } catch (e) {
    return { ok: false, errors: [`JSON 解析失败: ${e.message}`] };
  }

  for (const key of REQUIRED_TOP) {
    if (!(key in data)) errors.push(`缺少顶层键: ${key}`);
  }

  if (data.version && !/^\d+\.\d+\.\d+$/.test(String(data.version))) {
    errors.push(`version 应为 semver 形式: ${data.version}`);
  }

  for (const [objKey, leaf] of PATH_CHECKS) {
    const obj = data[objKey];
    const p = obj && typeof obj === 'object' ? obj[leaf] : null;
    if (!p || typeof p !== 'string') {
      errors.push(`${objKey}.${leaf} 缺失或非字符串`);
      continue;
    }
    const resolved = path.join(root, p.replace(/^\//, ''));
    if (!fs.existsSync(resolved)) {
      errors.push(`路径不存在: ${objKey}.${leaf} → ${p}`);
    }
  }

  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version && data.version && pkg.version !== data.version) {
        errors.push(`version 与 package.json 不一致: hints=${data.version} package=${pkg.version}`);
      }
    } catch {
      // ignore
    }
  }

  const ux = data.userExperience;
  if (ux && typeof ux === 'object') {
    if (typeof ux.maxNextActions !== 'number' || ux.maxNextActions < 1) {
      errors.push('userExperience.maxNextActions 应为正整数');
    }
    if (typeof ux.recoveryCardLines !== 'number' || ux.recoveryCardLines < 1) {
      errors.push('userExperience.recoveryCardLines 应为正整数');
    }
  }

  const orch = data.orchestration;
  if (orch && typeof orch === 'object') {
    if (typeof orch.qualityFirst !== 'boolean') {
      errors.push('orchestration.qualityFirst 应为布尔值');
    }
    if (typeof orch.signalDrivenAdjustment !== 'boolean') {
      errors.push('orchestration.signalDrivenAdjustment 应为布尔值');
    }
  }

  const anti = data.antiStall;
  if (anti && typeof anti === 'object') {
    if (typeof anti.defaultScenePackTimeoutMs !== 'number' || anti.defaultScenePackTimeoutMs < 1000) {
      errors.push('antiStall.defaultScenePackTimeoutMs 应为合理毫秒数（≥1000）');
    }
    if (typeof anti.hostMemoryMaxFiles !== 'number' || anti.hostMemoryMaxFiles < 1) {
      errors.push('antiStall.hostMemoryMaxFiles 应为正整数');
    }
  }

  const s3 = data.s3;
  if (s3 && typeof s3 === 'object' && typeof s3.maxFilesModifiedPerTurn !== 'number') {
    errors.push('s3.maxFilesModifiedPerTurn 应为数字');
  }

  const hp = data.hostPresentation;
  if (hp && typeof hp === 'object') {
    if (typeof hp.maxPrimaryActionsInChat !== 'number' || hp.maxPrimaryActionsInChat < 1) {
      errors.push('hostPresentation.maxPrimaryActionsInChat 应为正整数');
    }
    if (typeof hp.hideFullSkillAndIntakeJsonFromUserChat !== 'boolean') {
      errors.push('hostPresentation.hideFullSkillAndIntakeJsonFromUserChat 应为布尔值');
    }
    if (typeof hp.listDirFbsOnlyOnDemand !== 'boolean') {
      errors.push('hostPresentation.listDirFbsOnlyOnDemand 应为布尔值');
    }
    if (!hp.userFacingOneLinerJsonPath || typeof hp.userFacingOneLinerJsonPath !== 'string') {
      errors.push('hostPresentation.userFacingOneLinerJsonPath 应为非空字符串');
    }
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`用法: node scripts/validate-runtime-hints.mjs [--skill-root <技能根>]`);
    process.exit(0);
  }

  const { ok, errors } = validateRuntimeHints(args.skillRoot);
  if (ok) {
    console.log('validate-runtime-hints: ✅ fbs-runtime-hints.json 校验通过');
    process.exit(0);
  }
  console.error('validate-runtime-hints: ❌ 校验失败');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].includes('validate-runtime-hints')) {
  main();
}
