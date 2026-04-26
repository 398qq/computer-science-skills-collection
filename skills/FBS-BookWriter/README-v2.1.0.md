# FBS-BookWriter v2.1.0 审核版说明

> **福帮手出品 | 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、激活原料、原料盘点、整理素材**

## 版本定位

- **版本**：`2.1.0`
- **正式产物**：WorkBuddy Marketplace 包 + CodeBuddy Plugin 包
- **WorkBuddy 包**：`dist/fbs-bookwriter-v210-workbuddy.zip`
- **CodeBuddy 包**：`dist/fbs-bookwriter-v210-codebuddy.zip`
- **发布总入口**：`npm run pack:release`

## 本版重点

- 正式拆分为 **WorkBuddy** 与 **CodeBuddy** 两个独立交付通道
- `SKILL.md`、`_plugin_meta.json`、`.codebuddy-plugin/plugin.json` 已全部收口到统一宿主真值体系
- `.codebuddy-plugin/plugin.json`、`.codebuddy/agents/`、`.codebuddy/providers/` 现已随包交付
- 新增 `scripts/release-feedback-bridge.mjs`，支持发布后组织反馈回流到 `.fbs/org-feedback/`
- WorkBuddy 与 CodeBuddy 均通过各自 `channel-manifest.json` 声明默认入口与能力边界

## 上架包内的关键入口

- `SKILL.md`：技能主规范与执行速查卡
- `workbuddy/channel-manifest.json`：WorkBuddy 市场包清单
- `codebuddy/channel-manifest.json`：CodeBuddy 插件包清单
- `.codebuddy-plugin/plugin.json`：插件级元数据与默认代理
- `scripts/release-feedback-bridge.mjs`：组织反馈回流入口
- `CHANGELOG.md`：完整版本变更记录
- `releases/workbuddy-review-v2.1.0.md` / `releases/codebuddy-review-v2.1.0.md`：双通道发布说明

## 提交审核建议

随正式产物一并提供：

1. `dist/fbs-bookwriter-v210-workbuddy.zip`
2. `dist/fbs-bookwriter-v210-codebuddy.zip`
3. 两份 verification 报告
4. 两份 channel manifest
5. 本文件 `README-v2.1.0.md`

## 说明

本文件是 `v2.1.0` 的**版本冻结说明页**，用于与双通道打包脚本、发布说明和历史归档保持一致；日常开发请优先查看根目录 `README.md`。
