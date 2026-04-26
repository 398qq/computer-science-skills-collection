# 内部版本线全文归档（未单独上架）

> 以下内容自 `CHANGELOG.md` 迁出，便于主日志保持可读。能力已合入 **v2.1.0**。

---

## [2.0.3] - 2026-04-11（宿主融合记忆 · 平台精准感知 · 技能生态修正）

> **定性**：基于 WorkBuddy 环境实测（v4.0 探测报告）和记忆能力深度审计，修正三类系统性错误，启动宿主融合记忆架构，升级平台检测为三分支精确感知。

### Fixed（修复）

- **[F1] XLSX Tier1 错误链路修正**：`minimax-xlsx` 从未存在于 WorkBuddy 本地市场，`SKILL.md` / `fbs-team-lead.md` / `provider-registry.yml` 中的错误 Tier1 链路全部修正为"仅 Tier2（`xlsx` 插件）"
- **[F2] 技能归属速查表修正**：删除 `minimax-xlsx` WorkBuddy Tier1 错误条目，补充 `humanizer`（去AI味，WorkBuddy Tier1）和 `pptx-generator`（PPT通用备选，WorkBuddy Tier1）
- **[F3] wechat-search 国际版区分**：`wechat-article-search` 在 CodeBuddy 国际版标注为 `unavailable`（不只是降级），`fbs-team-lead.md` S0 组合表中增加国际版自动跳过说明
- **[F4] section-8-onboarding.md 品牌修复**：第27行 "FBS-BookWriter" → "福帮手"
- **[F5] brand-outputs.md 补充品牌规范表**：新增完整品牌名使用规范（用户侧/技术标识/英文场景映射表）

### Added（新增）

- **[A1] 平台检测升级为三分支**：WorkBuddy → CodeBuddy → standalone，同步更新 `SKILL.md` 架构图、`fbs-team-lead.md` 检测逻辑、`brand-platform-convention.md` 对照表、`provider-registry.yml` dispatch 节点
- **[A2] humanizer Provider 新增**：在 `provider-registry.yml` 中新增 `humanizer` Provider（WorkBuddy Tier1，CodeBuddy 降至 FBS 内置 `ai-pattern-lexicon.json` 扫描兜底），`SKILL.md` 功能边界表新增去AI味增强行
- **[A3] 宿主融合记忆启动（E2+E9）**：
  - `fbs-team-lead.md` 新增 **记忆持久化规则**：S0/S2/S3/S4/用户偏好 五个时刻强制调用 `update_memory` 写入宿主知识库（跨会话可达）
  - `fbs-team-lead.md` 首次接触规则升级：新会话启动时**自动检测并读取** `.fbs/smart-memory/session-resume-brief.md`，首响直接告知用户书名/阶段/上次操作，无需用户手动说"继续上次"
- **[A4] SMART-MEMORY-ARCHITECTURE.md v2.0.3 升级**：归档 WorkBuddy 记忆能力审计结论（D1-D6 缺陷清单）、宿主融合增强路线图（E1-E14 分四个 Phase）、不做边界（X1-X4）
- **[A5] brand-platform-convention.md v1.1 升级**：平台能力对照表扩展为三列（WorkBuddy / CodeBuddy国内版 / CodeBuddy国际版），补充 `humanizer`/`pptx-generator`/xlsx Tier2 专有说明，技能中文名映射表新增平台归属列

### Changed（变更）

- **[C1] SKILL.md Plugin Bus 版本升至 v3.2**：架构图平台检测注释升级，技能归属速查表从 16 条升至 18 条（含 humanizer/pptx-generator）
- **[C2] 智能记忆跨会话恢复状态升级**：`SKILL.md` 功能边界表从"⚠️ 默认不自动恢复"升级为"⚠️ 半自动恢复"（team-lead 自动检测 + `update_memory` 跨会话持久化）
- **[C3] README-v2.0.3.md 同步更新**：v2.0.3 版本说明修订为本版实际交付内容

---

## [3.0-internal-track] - 2026-04-11（WorkBuddy × Plugin Bus 技能生态整合，内部能力线，未单独上架）

> **定性**：FBS 从"6个插件用户"升级为"156个本地技能编排者"。核心洞察：WorkBuddy 本地预装 156 个技能（skills-marketplace），FBS v3.0 通过 Plugin Bus 三层架构将其串联为完整书籍生产流水线，实现零网络延迟、零安装成本的一键整合。

### Added（新增）

- **[核心] Plugin Bus v3.0 三层 Provider 架构**：新建 `.codebuddy/providers/provider-registry.yml`，定义 15 个 Provider，三层技能获取优先级：Tier1（本地市场156个预装）→ Tier2（已安装插件）→ Tier3（远程发现）
- **[核心] fbs-team-lead Sub-Agent**：新建 `.codebuddy/agents/fbs-team-lead.md`，实现三层 Provider 调度、团队编排（Solo/Small Team/Full Team）、ESM 状态机管理、写入边界控制
- **[核心] 16个 Tier1 技能激活**：将 `deep-research`/`citation-manager`/`minimax-docx`/`minimax-pdf`/`multi-search-engine`/`content-ops`/`agent-team-orchestration`/`content-factory`/`deck-generator`/`notebooklm-studio`/`wechat-article-search`/`autoresearch`/`content-repurposer`/`minimax-xlsx`/`web-search-exa`/`nano-pdf` 从本地市场激活到 `.codebuddy/skills/`
- **[核心] 14个 Provider 定义文件**：新建 `.codebuddy/providers/provider-*.md`（deep-research/multi-search/citation/docx-delivery/pdf-literature/pptx-delivery/quality-panel/xlsx-data/content-transform/learning-products/copy-optimizer/team-orchestration/wechat-search/skill-discovery）
- **[文档] Plugin Bus 协议规范**：新建 `references/06-plugin/plugin-bus-spec.md`（三层协议/状态声明格式/S阶段速查表/错误处理三级）
- **[文档] S5 全格式交付 SOP v3.0**：新建 `references/06-plugin/s5-full-delivery-sop.md`（DOCX/PDF/PPTX/XLSX四管线 + S6 转化 SOP）
- **[能力] S0 深度调研**：`deep-research` Tier1（/research→/research-deep→/research-report 结构化），替代 playwright 为 S0 主引擎
- **[能力] S0 多引擎搜索**：`multi-search-engine` Tier1（17引擎，8国内+9国际），中文书稿自动启用
- **[能力] S0 学术引用**：`citation-manager` Tier1（Crossref API + APA/MLA/Chicago/GB-T/IEEE/Harvard）
- **[能力] S4 专家面板**：`content-ops` Tier1，递归迭代至 90+ 分，增强 S4 质检门禁
- **[能力] S5 DOCX 升级**：`minimax-docx` Tier1（OpenXML SDK + GB/T 9704-2012 + XSD 校验），优于通用 docx
- **[能力] S5 PDF 升级**：`minimax-pdf` Tier1（token 设计系统，印刷级），优于通用 pdf
- **[能力] S6 学习产品**：`notebooklm-studio` Tier1，9种产物（播客/测验/抽认卡/思维导图/幻灯片）
- **[能力] S6 内容转化**：`content-factory` Tier1，五角色 Agent（Writer/Remixer/Editor/Scriptwriter/HeadlineMachine）
- **[能力] S6 文案进化**：`autoresearch` Tier1，Karpathy式50+变体+5专家评分+进化迭代

### Fixed（修复）

- **fbs-researcher.md 升级**：增加三层搜索策略（deep-research/multi-search/citation-manager/wechat-search），搜索台账新增 `provider`/`tier` 字段
- **workbuddy-agent-briefings.md 升级**：补充 156 个本地技能生态信息、关键 Tier1 技能列表、三层 Provider 架构说明

### Changed（变更）

- **SKILL.md 已知限制表更新**：PDF/DOCX/PPTX/XLSX 从"⚠️ 可选"升级为"✅ Plugin Bus 支持"，添加 Tier1/Tier2/Fallback 完整链路说明
- **SKILL.md 新增 Plugin Bus v3.0 技能生态章节**：三层 Provider 架构图、19个 FBS 相关本地技能清单
