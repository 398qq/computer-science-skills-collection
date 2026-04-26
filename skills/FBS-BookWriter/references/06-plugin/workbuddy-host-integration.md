# WorkBuddy 宿主集成说明（最小契约）

> **版本**：2.1.0  
> **受众**：WorkBuddy 宿主 / 插件加载器实现方  

## 1. 会话启动时必须可调用的脚本（与 `workbuddy/channel-manifest.json` → `entry` 对齐）

| 键 | 路径 | 用途 |
|----|------|------|
| `hostCapability` | `scripts/host-capability-detect.mjs` | 探测 `~/.workbuddy`、Tier1 技能目录、插件；写 `.fbs/host-capability.json` |
| `intakeRouter` | `scripts/intake-router.mjs` | 首响路由、恢复优先、输出 JSON 动作列表 |
| `sessionSnapshot` | `scripts/workbuddy-session-snapshot.mjs` | 生成/刷新恢复卡 |
| `profileBridge` | `scripts/workbuddy-user-profile-bridge.mjs` | 宿主画像 → 开场协议 |
| `presentationConsumer` | `scripts/host-consume-presentation.mjs` | 解析交付预览；返回 `hostAction`，**不自动打开 UI** |
| `feedbackBridge` | `scripts/release-feedback-bridge.mjs` | 组织反馈可选 |

**建议调用顺序**：新会话 → `host-capability-detect`（或依赖缓存）→ `intake-router --intent auto --json` → 模型按输出执行。仅挂载 skill 文本而不执行上述脚本时，**功能会显著降级**。

### 1.0 用户可见区与注入物（机读：`fbs-runtime-hints.json` → **`hostPresentation`**）

> 与两轮 WorkBuddy 实测对齐：**用户面对的是服务，不是开发文档**。

**默认行为（建议作为宿主默认实现）**

| 区域 | 内容 |
|------|------|
| **主对话 / 用户消息区** | 仅 `intake-router` JSON → `firstResponseContext.userFacingOneLiner`（一行）+ **≤3** 个主按钮/选项（与 `hostPresentation.maxPrimaryActionsInChat` 一致） |
| **开发者 / 调试 / 折叠面板** | 完整 `intake-router` JSON、原始 `stdout`、可选 SKILL 片段 |
| **禁止** | 将 **SKILL.md 全文**、**完整 intake JSON**、`references/**` 长规范**默认注入**到用户可见对话流 |
| **禁止** | 将模型/编排层的**元指令**（如「按 v* 规范」「JSON 输出」「不重复读」「干净首屏」）与主对话气泡混排；此类内容仅应留在折叠「过程/调试」或系统日志 |

**其它**

- **list_dir `.fbs/`**：默认不要做；用户明确要看目录结构或排障时再扫（`hostPresentation.listDirFbsOnlyOnDemand`）。
- **退出**：见 §1.1；执行 `session-exit` 前须有软确认（见 JSON `agentGuidance.beforeExit`）。

**实现检查清单（产品侧自验）**

1. 新会话首条用户可见内容是否 **≤1 行摘要 + 3 动作**，且无整页 JSON。  
2. 「技能说明」与「当前对话」是否 **UI 分流**。  
3. 退出路径是否先确认再调用 `sessionExit`。

## 1.1 退出（session-exit）调用约束（P0）

用户说「退出 / 停止 / 退出福帮手」时，宿主或自动化须执行 `entry.sessionExit` 指向的脚本以写入 `.fbs/workbuddy-resume.json` 与摘要。

- **必须**传入 `--book-root <书稿根目录绝对路径>`。本脚本**不再**默认把 `process.cwd()` 当作书根。
- **禁止**在「仅切换到书稿目录」后使用相对路径 `node scripts/session-exit.mjs`：Node 会把入口解析为「书稿根下的 `scripts/session-exit.mjs`」，该路径不存在，报错类似 `Cannot find module '…<书稿根>\\scripts\\session-exit.mjs'`。
- **推荐**其一：
  - 使用技能安装目录内脚本的**绝对路径**调用 `session-exit.mjs`；
  - 或在**技能包根目录**下执行：  
    `node scripts/fbs-cli-bridge.mjs exit -- --book-root <书稿根绝对路径> --json`  
    （`fbs-cli-bridge` 会固定解析到本包内的 `session-exit.mjs`。）

乐包与行为激励说明见 [`../05-ops/credits-guide.md`](../05-ops/credits-guide.md)。

## 2. CodeBuddy 通道

`codebuddy/channel-manifest.json` 的 `entry` 与 WorkBuddy **对齐同一套脚本路径**，便于双通道宿主复用集成逻辑。

## 3. 结果展示

宿主必须在适当时机调用返回体中的 `preview_url` / `open_result_view`；`host-consume-presentation.mjs` 的 JSON 中含 `hostIntegrationNote` 字段说明此点。

## 4. 相关文件

- 发布核验清单：[`../../releases/workbuddy-integration-checklist.md`](../../releases/workbuddy-integration-checklist.md)  
- Tier1 与仓库快照：[`tier1-marketplace-faq.md`](./tier1-marketplace-faq.md)  
- 运行时提示（可选读取）：[`../../fbs-runtime-hints.json`](../../fbs-runtime-hints.json)  

## 5. 宿主系统级记忆（create / update / delete）

若宿主向模型暴露**系统级记忆**能力，建议与福帮手约定如下语义（具体工具名以实现为准）：

| 操作 | 说明 |
|------|------|
| **create** | 创建新记忆。 |
| **update** | 更新已有记忆，**调用方须提供宿主分配的记忆 ID**。 |
| **delete** | 删除记忆；适用于用户**明确推翻**先前已写入宿主的信息。 |

福帮手侧：**书稿长篇真值**仍以 `书稿根/.fbs/` 内文件为准；宿主记忆宜承载**短摘要、可检索条目**，并在 `update` 时保证 ID 传递闭环。详细执行契约见 [`../01-core/runtime-mandatory-contract.md`](../01-core/runtime-mandatory-contract.md) §5。

## 6. 对用户话术与日志（Tier / 探测字段）

- **日志与 API 响应**可保留原始字段名（如 Tier、脚本路径），便于排障与自动化。  
- **展示给终端用户的文案**应脱敏：不把 Tier、内部模块名、脚本文件名**原样**抛给用户；口语化转述见 [`../05-ops/ux-agent-playbook.md`](../05-ops/ux-agent-playbook.md) §6 对照表。  
- **例外**：用户为开发者且主动索要「原始 JSON / 日志」时，可提供，并标注为调试信息。
