# WorkBuddy 官方审核包说明（v2.1.0）

- **版本**：`2.1.0`
- **状态**：已完成双通道拆分后的 WorkBuddy 独立审核包收口
- **审核包**：`dist/fbs-bookwriter-v210-workbuddy.zip`
- **校验报告**：`dist/fbs-bookwriter-v210-workbuddy.verification.json`
- **通道清单**：`workbuddy/channel-manifest.json`
- **配套 CodeBuddy 包**：`dist/fbs-bookwriter-v210-codebuddy.zip`

## 本次对齐结果

- WorkBuddy 包已拥有独立打包入口：`npm run pack:workbuddy` / `npm run pack:v210`
- `.codebuddy-plugin/plugin.json`、`.codebuddy/agents/`、`.codebuddy/providers/` 现在随 WorkBuddy 包一起交付
- `_plugin_meta.json` 已升级为双通道声明：`workbuddy-marketplace` + `codebuddy-plugin`
- `SKILL.md` 已改成双通道分轨说明，不再把一个裁剪包写成两套生态的折中语义
- `scripts/release-feedback-bridge.mjs` 已纳入包内，可将组织反馈回流到 `.fbs/org-feedback/`
- `workbuddy/channel-manifest.json` 已补齐插件元数据、代理目录与 companion package 信息

## 打包校验关注点

重点核对以下文件已进入 ZIP：

1. `workbuddy/channel-manifest.json`
2. `.codebuddy-plugin/plugin.json`
3. `.codebuddy/agents/fbs-team-lead.md`
4. `.codebuddy/providers/provider-registry.yml`
5. `scripts/release-feedback-bridge.mjs`

以 `dist/fbs-bookwriter-v210-workbuddy.verification.json` 为最终校验真值。

## 提交建议

提交 WorkBuddy 官方审核时，优先附上：

1. `dist/fbs-bookwriter-v210-workbuddy.zip`
2. `dist/fbs-bookwriter-v210-workbuddy.verification.json`
3. `workbuddy/channel-manifest.json`
4. 本说明文件 `releases/workbuddy-review-v2.1.0.md`
