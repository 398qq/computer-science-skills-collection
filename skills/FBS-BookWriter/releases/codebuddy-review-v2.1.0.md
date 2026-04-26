# CodeBuddy 插件包说明（v2.1.0）

- **版本**：`2.1.0`
- **状态**：已拆分为独立 CodeBuddy 通道产物
- **产物**：`dist/fbs-bookwriter-v210-codebuddy.zip`
- **校验报告**：`dist/fbs-bookwriter-v210-codebuddy.verification.json`
- **通道清单**：`codebuddy/channel-manifest.json`
- **插件元数据**：`.codebuddy-plugin/plugin.json`

## 本次交付重点

- CodeBuddy 通道拥有独立 `channel-manifest.json`
- `.codebuddy-plugin/plugin.json`、`.codebuddy/agents/`、`.codebuddy/providers/` 现在随包交付
- 默认代理切换为 `fbs-team-lead`，让宿主拿到完整编排入口
- 与 WorkBuddy 包分轨构建，避免一个裁剪包同时承担两套生态语义
- 组织反馈回流脚本 `scripts/release-feedback-bridge.mjs` 已纳入包内

## 构建入口

- `npm run pack:codebuddy`
- `npm run pack:release`（同时构建 WorkBuddy + CodeBuddy）

## 提交 / 自测建议

1. 运行 `npm run pack:codebuddy`
2. 核查 `dist/fbs-bookwriter-v210-codebuddy.verification.json`
3. 重点确认 `.codebuddy-plugin/plugin.json`、`.codebuddy/agents/fbs-team-lead.md`、`codebuddy/channel-manifest.json` 已进入 ZIP
