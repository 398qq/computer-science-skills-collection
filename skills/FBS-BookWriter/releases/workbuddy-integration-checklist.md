# WorkBuddy 审核 / 集成检查清单（FBS-BookWriter v2.1.0）

用于发布前核对：**技能包完整性、宿主最小集成、体验契约**。

## A. 包内文件

- [ ] `dist/fbs-bookwriter-v210-workbuddy.zip` 可生成且无报错  
- [ ] `SKILL.md`、`workbuddy/channel-manifest.json`、`_plugin_meta.json` 版本号一致  
- [ ] `fbs-runtime-hints.json` 存在且 `version` 与包一致  
- [ ] `references/05-ops/search-preflight-contract.json` 存在  

## B. 宿主最小集成

- [ ] 会话启动可调用 `scripts/host-capability-detect.mjs`（或接受其缓存策略）  
- [ ] 首响可调用 `scripts/intake-router.mjs --book-root <书根> --intent auto --json`  
- [ ] 用户退出时可调用 `scripts/session-exit.mjs --book-root <书根绝对路径> --json`（**勿**在书稿目录下用相对路径 `node scripts/session-exit.mjs`；见宿主文档 §1.1）  
- [ ] 展示结果前可调用 `scripts/host-consume-presentation.mjs`，并实际执行返回的 `preview_url` / `open_result_view`  
- [ ] 已读 [`references/06-plugin/workbuddy-host-integration.md`](../references/06-plugin/workbuddy-host-integration.md)  

## C. 体验契约（抽样）

- [ ] `npm run pack:skill-gates` 通过（或等价 CI 任务）  
- [ ] `node scripts/ux-flow-guard.mjs --skill-root . --book-root . --enforce` 通过  
- [ ] `intake-router --json` 含 `firstResponseContext`（首响环境三元组）；`session-exit` 退出后存在 `书稿根/.workbuddy/memory/当日.md` 叙事镜像（或显式 `--no-workbuddy-mirror`）  
- [ ] 排障：`npm run diagnostics:host -- --book-root <书稿根> --json` 可运行  

## D. Tier1 期望

- [ ] 支持文档中说明：用户 **无需** 安装全部 `preferredSkills`，降级为预期行为  
