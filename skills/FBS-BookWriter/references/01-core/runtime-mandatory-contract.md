# 运行时强制契约（主 Agent / 宿主对齐）

> **版本**：2.1.0  
> **依据**：audit-skill-runtime-2026-04-13 及 SKILL.md 执行速查卡

---

## 1. 为何需要本文档

Skill 通过 `use_skill` 或文档注入加载时，**只会**把 `SKILL.md` 与规范文本放进上下文，**不会**自动执行任何 `node scripts/…`。因此存在架构盲区：**Skill 已加载 ≠ intake-router / session-exit 已运行**。

---

## 2. 开场：必须先跑 intake-router

| 项目 | 要求 |
|------|------|
| 命令 | `node scripts/intake-router.mjs --book-root <书稿根> --intent auto --json --enforce-required` |
| 时机 | 每次用户通过「福帮手」等触发词开始工作、或 `bookRoot` 变更后的**第一轮** |
| 脚本侧效果 | 宿主能力检测与缓存、恢复卡/会话摘要补写、**ESM 体裁对齐（若 project-config 已就绪）**、**场景包加载 + 乐包 registerBook**（见 `scripts/intake-runtime-hooks.mjs`） |

若跳过该步骤，乐包账本、场景包状态文件可能不会按设计更新，续写与商业化埋点不完整。

---

## 3. 退出：必须先跑 session-exit

| 项目 | 要求 |
|------|------|
| 触发 | 「退出」「停止」「取消」「退出福帮手」「关闭福帮手」等（与 `section-nlu.md` STOP 对齐） |
| 命令 | `node scripts/session-exit.mjs --book-root <书稿根> --json` |
| 用户可见回复 | 须包含 JSON 中的 **`userMessage`**（标准文案：已记录状态，下次输入「福帮手」可继续） |

---

## 4. 相关机读配置

- `fbs-runtime-hints.json` → `compliance` 与 `scriptBridge` 段；**宿主展示**另见 **`hostPresentation`**（用户可见仅 `userFacingOneLiner` + 主选项，见 [`../06-plugin/workbuddy-host-integration.md`](../06-plugin/workbuddy-host-integration.md) §1.0）  
- `intake-router` JSON 输出 → `compliance` / `runtimeHooks` / `firstResponseContext`（含 `userFacingOneLiner`）  
- `workbuddy/channel-manifest.json` / `codebuddy/channel-manifest.json` → `scriptBridge`（检索前置合同、企微场景包、乐包仍走脚本，**不拆 MCP**）

**用户可见层（P0）**：Agent 与宿主**不得**把「按版本规范」「JSON 输出」「不重复读文件」等**内部自检/编排用语**当作对用户首句；终端侧仅 `userFacingOneLiner` + 主选项（见 `openingGuidance.hostInjectionContract`）。

更多命令对照：[`skill-cli-bridge-matrix.md`](./skill-cli-bridge-matrix.md)

---

## 4.1 书稿元数据真值（`.fbs/project-config.json`）

建议在 **S1 定名后**维护与展示一致的书名与体量，供 `workbuddy-session-snapshot` 与恢复卡使用：

| 字段 | 含义 |
|------|------|
| `bookTitle` | 正式书名 |
| `plannedChapterTotal` | 规划总章数（数字） |
| `targetWordCount` | 目标总字数（字） |

初始化模板见 `init-fbs-multiagent-artifacts.mjs` 写入的 `project-config.json` 说明字段。

---

## 5. 宿主系统级记忆（create / update / delete）

WorkBuddy 等宿主可提供**系统级记忆**能力（与书稿目录 `.fbs/` 内文件相互独立）。福帮手与之对齐时遵守：

| 操作 | 语义 | 福帮手侧用法 |
|------|------|----------------|
| **create** | 创建一条新记忆 | 首次记录某类信息（如新书名、新偏好主题）且无既有宿主记忆 ID 时使用。 |
| **update** | 更新已有记忆 | **必须携带宿主返回的记忆 ID**；用于阶段推进、补充同一主题的增量（如 S2 大纲修订）。 |
| **delete** | 删除记忆 | 用户**明确否定、推翻**先前已写入宿主记忆的内容时删除对应条目，避免跨会话误导；删除后再用 **create** 写入新真值亦可。 |

**与 `.fbs/smart-memory/` 的关系**：书稿级风格、章节进度、偏好快照仍以 **磁盘文件为权威真值**；宿主记忆用于 **跨会话、宿主侧检索** 的短摘要镜像。二者冲突时以 **当前用户陈述 + `.fbs` 最新写盘** 为准，并执行 **delete / 更新脚本落盘** 对齐。

机读摘要：`fbs-runtime-hints.json` → `hostMemory`。

---

返回主文档：[`SKILL.md`](../../SKILL.md)
