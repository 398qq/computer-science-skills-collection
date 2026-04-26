# 附录：2.0.2-patch 长列表归档

> 自 `CHANGELOG.md` 迁出。原「2.0.2-patch」分支**非正式版本号**，记录已合入后续主干。

---

### Fixed

- **[L3-1] terminology-gate.mjs BUG-004 四子缺陷全修复**：
  - 缺陷A（核心）：增加 `GLOSSARY.md` 读取，拦截率从 0% 恢复正常
  - 缺陷B：`parseForbidden()` 节标题正则扩展为 `/(禁用变体|禁用写法)/`
  - 缺陷C：新增 `normalizeTerm()` 全角→半角标准化，消除全角变体漏检
  - 缺陷D：违规报告增加行号、替换建议、帮助中心 URL
- **[NP0-04] terminology-gate.mjs ESM 入口守卫**：防止被 `import` 调用时触发 `main()` 中的 `process.exit`
- **[L2-2 补齐] s3-start-gate.mjs Brief 覆盖率门禁真正落地**：从 `.fbs/chapter-status.md` 扫描未完成章节，校验 `.fbs/writing-notes/*brief*.md` 是否存在且达到 `200` 字阈值；仅在 Brief 失败时输出 T2 注册引导，并把 `brief_coverage` 纳入结构化 run log
- **[L3-3 对齐] quality-audit-incremental.mjs 参数/文档一致性修复**：新增 `--chapter-file` 直接审计单章能力，修复文档里有命令、脚本里不能跑的问题
- **[CLI UX] 阶段一关键脚本补齐 `--help`**：`terminology-gate.mjs`、`s3-start-gate.mjs`、`quality-audit-incremental.mjs` 现在都可独立输出帮助信息，不再把存在性检查误判成参数错误
- **[R-GIT-1 + NP0-05] .gitignore 安全修复**：追加 `.fbs/user.json`、`.fbs/user-auth.json`、`.fbs/points.json`、`.fbs/gate-run-log*.jsonl` 规则，防止敏感数据被追踪入仓库
- **[runtime-direct 假性卡住] EventBus / standard-execution-chain 收尾修复**：去重清理定时器改为 `unref()` 且在 `cleanup()` 中统一释放，同时将 `cleanupEventBus()` 下沉到 `runStandardExecutionChain()` 内部，避免外部模块直调时残留活动句柄导致流程看似停在章节索引之后

### Added

- **[L2-3 + N-4] s3-start-gate.mjs 结构化守卫运行日志**：新增 `appendGateRunLog()` 函数，每次门禁运行后写入 `.fbs/gate-run-log.jsonl`（JSON Lines），记录 `ts/event/exitCode/failureCount/failures/mode/stagesChecked/bookRoot` 字段
- **[NP0-01] s3-start-gate.mjs T2 注册引导文案**：当 Brief 门禁失败时，在报错末尾追加 T2 免费会员注册引导（`api.u3w.com/register`）
- **[L3-3] quality-audit-incremental.mjs S层质检日志联动**：若 `.fbs/gate-run-log.jsonl` 已存在，增量质检会自动写入 `s_layer_audit` 事件，记录 `chapterId/auditResult/score`
- **[L3-1] terminology-gate.mjs `scanChapter()` 模块导出接口**：供 `s3-start-gate.mjs` 程序化调用，返回结构化违规结果，日志由上层统一写入（D-OPS-1）
- **[tests] 阶段一补丁回归测试**：新增 `terminology-gate.test.mjs`、`s3-start-gate.test.mjs`、`quality-audit-incremental.test.mjs`，覆盖 help、Brief 阻断、章节质检与日志写入链路
- **[contracts] 入口/工作区 contract tests**：新增 `entry-contracts.test.mjs`，锁定 `WP1/WP2`、搜索前置合同、workspace 真值边界与首个可用工作面要求
- **[smart-memory] 智能记忆主链分层收口**：`smart-memory-core.mjs`（核心真值层）、`smart-memory-natural.mjs`（自然语言入口层）、`init-project-memory.mjs`（项目初始化编排层）、宿主桥接脚本（可选）统一分层收口；跨会话风格/章节进度/术语锁定自动恢复

### Changed

- **[entry-contract] 首响入口改为先白话后术语**：`SKILL.md`、`intake-and-routing.md`、`section-8-onboarding.md` 对齐「先整理材料 / 先明确主题 / 先一起找方向」的去术语化入口，并把 `WP1 → 搜索前置合同 → WP2` 固定为默认切换顺序
- **[workspace-governance] 首个可用工作面落到脚本与核验输出**：`init-fbs-multiagent-artifacts.mjs` 现在会返回 `WP2` 工作面信息，`verify-expected-artifacts.mjs` 同步输出首个可用工作面摘要
- **[ops] audit-entry-performance.mjs 扩展为入口契约审计**：新增对 `entryWorkplanes`、`searchPreflightContract`、`workspaceGovernance` 机读配置以及相关文档区块的校验

### UX 优化（2026-04-11）

- **[UX-1] 激活响应去机械感**：`SKILL.md` + `nlu-optimization.mjs` 删除「技能已加载，请描述任务」套话；新增 `getActivationResponse(context)` 方法，根据续写上下文/新用户/通用场景三种情境输出不同的自然语言响应
- **[UX-2] S0.5 引导去生硬感**：`section-8-onboarding.md` + `intake-and-routing.md` + `onboarding-config.mjs` 第1轮由双问号打包改为开放式自然引导，禁止首轮出现「虚拟书房/S0/WP1」等术语；偏好从引导期强制收集改为写作过程中自然推断
- **[UX-3] 质检进度防卡顿**：`SKILL.md` + `search-policy.json` + `quality-panorama-orchestrator.mjs` 进度报告模板改为自然语言；新增心跳模板（每~15秒提示）、阶段切换通知、超时收束说明三类模板；大范围门禁提示改为人性化措辞
- **[UX-4] 空状态 + 帮助建议文案**：`nlu-optimization.mjs` 全书视图空状态、乐包余额、帮助建议文案全面改「你」体，移除内部命令裸露
- **[UX-5] SKILL.md 新手第一步说明修正**：从「建立自己的虚拟书房」改为「说出想做什么，AI 自动引导建立虚拟书房」
- **[test] entry-contracts.test.mjs 更新**：同步断言为新 UX 规范（检查机械套话不存在 + 自然引导原则存在）；全量 104 测试通过

### Docs

- **[L1-1] intake-and-routing.md**：文件末尾追加 `[v2.0.2 补丁] S0 强制说明` 区块，明确 S0 联网检索必须完成并留有记录
- **[L2-1] workbuddy-agent-briefings.md**：追加 `[v2.0.2 补丁] S3 启动 P0 强制步骤` 区块（CLI + 口头核查两套流程），优先级高于原有 S3 启动说明
- **[L3-3] workbuddy-agent-briefings.md**：追加 `[v2.0.2 补丁] Writer 完成条件（两阶段）` 区块，含阶段一 Writer 自验（术语检查 + S层质检）和阶段二 team-lead 收尾

> **注**：上述 Docs 条目中的章节标题已在 v2.1.0 规范中改为中性「P0 强制」表述，内容仍有效。
