# 发版与双通道产物核对清单

> **版本**：2.1.0  
> **适用**：维护者打 `pack:workbuddy` / `pack:codebuddy` / `pack:release` 前自检。

---

## 1. 自动化门禁（须全绿）

| 命令 | 说明 |
|------|------|
| `npm test` | 全量 Vitest |
| `npm run test:contract` | 契约类快测（可选作本地首跑） |
| `npm run pack:skill-gates` | 版本三角、场景包、链接、manifest、`validate-runtime-hints`、ux-flow、consistency-audit、契约单测 |
| `npm run quality:audit:full` | `references/**/*.md` 机器可检项 |
| `npm run build:check` | 构建链自检 |
| `npm run audit:all:strict` | P0 六段严模式（与 CI `--strict` 对齐） |
| `node scripts/validate-runtime-hints.mjs --skill-root .` | 机读 hints 单独复验（已含于 pack:skill-gates） |

---

## 2. 产物与文档

- [ ] `dist/` 下目标包与 `*.verification.json`（若流程生成）符合本次发布说明。
- [ ] `SKILL.md` / `package.json` / `_plugin_meta.json` / 双通道 `channel-manifest.json` 版本一致（由 `pack:skill-gates` 与 `consistency-audit` 覆盖）。
- [ ] 用户侧索引无断链（`references/01-core/skill-index.md`）。

---

## 3. 分发边界

- [ ] 企业侧-only 文档未误入用户 ZIP（见 `documentation-layers.md`）。
- [ ] WorkBuddy / CodeBuddy 各自 manifest 与插件元数据指向正确技能 ID。

---

## 4. 大变更时的增量建议

- 文档大面积改动：先 `npm run quality:audit:incremental`（缩小范围）。
- 检索/台账约定变更：确认 `fbs-runtime-hints.json` 与 `search-policy.json` 已同步，并跑 `validate-runtime-hints`。
