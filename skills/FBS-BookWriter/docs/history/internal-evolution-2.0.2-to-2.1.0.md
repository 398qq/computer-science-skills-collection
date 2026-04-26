# 2.0.2 → 2.1.0 内部演进说明（送审前归纳）

> **定位**：自 **v2.0.2** 起至 **v2.1.0** 正式送审前，仓库长期处于**内部测试与能力合入**，未对渠道单独上架中间版本。  
> **权威现状**：以根目录 **`SKILL.md`**、**`CHANGELOG.md`（精简后的版本叙事）**、**`references/`** 与 **`fbs-runtime-hints.json`** 为准。

---

## 1. 版本线如何理解

| 标签 | 含义 |
|------|------|
| **2.0.2** | 对外叙述中的「宿主适配与记忆分层收口」基线，详见 CHANGELOG。 |
| **2.0.3 / 内部能力线（原 3.0-internal-track 等）** | **未单独发布**；条目已合入 **2.1.0**，详细条目见 [`changelog-archive-internal-lines.md`](./changelog-archive-internal-lines.md)。 |
| **2.1.0** | 双通道产物、检索闭环、主动恢复、脚本/CLI 契约与 CI 门禁的**统一收口版本**，作为送审与分发主版本。 |

---

## 2. 能力落点（查文档即可，不必追中间版号）

| 主题 | 权威位置 |
|------|----------|
| 入口 / 恢复 / intake | `SKILL.md`、`references/01-core/intake-and-routing.md`、`scripts/intake-router.mjs` |
| 宿主与双通道 | `scripts/host-capability-detect.mjs`、`workbuddy/channel-manifest.json`、`codebuddy/channel-manifest.json` |
| 检索与台账 | `references/05-ops/search-policy.json`、`scripts/record-search-preflight.mjs` |
| UX 与防卡顿 | `references/01-core/ux-optimization-rules.md`、`references/05-ops/ux-agent-playbook.md`、`references/05-ops/anti-stall-guide.md` |
| 机读运行时 | `fbs-runtime-hints.json`、`scripts/validate-runtime-hints.mjs` |
| 发版与 CI | `references/05-ops/release-checklist.md`、`.github/workflows/ci.yml` |

---

## 3. 历史材料存放

| 目录 / 文件 | 说明 |
|-------------|------|
| `docs/reports/` | 阶段性审计与实施报告（过程留痕，非日常必读） |
| `docs/history/changelog-archive-internal-lines.md` | 原 CHANGELOG 中 **2.0.3**、**内部能力线** 全文条目归档 |
| `docs/history/changelog-appendix-2.0.2-patch-supplement.md` | 原「2.0.2-patch 附录」中长列表归档 |
| `docs/history/SMART-MEMORY-ARCHITECTURE-v2.0.2.md` | 记忆架构演进留档 |

---

## 4. `releases/` 目录（仓库根）

仅保留**仍具送审/清单价值**的固定文档；**内部测试闭环类**一次性说明已删除，结论合入本页与 CHANGELOG。  
见 [`../../releases/README.md`](../../releases/README.md)。

---

## 5. 与原「迁移说明」的关系

原 `v2.1.0-migration-note.md` 中**机器路径、旧工作区**等一次性信息已下线；演进关系以**本节 + CHANGELOG** 为准。
