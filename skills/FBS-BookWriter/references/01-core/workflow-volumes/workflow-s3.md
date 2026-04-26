# S3 节点 — 导航入口

> 本文件为 S3 阶段总索引。内容已拆分为三个子卷，请按需加载，避免一次性加载全部内容。

## 子卷导航

| 子卷 | 内容 | 何时加载 |
|------|------|---------|
| [`workflow-s3-core.md`](./workflow-s3-core.md) | 入口条件 · 联网超时处理 · Auto-Run 断点机制 · 骨架检测 · 台账实测 · 单章写稿流程 | **必读**，开始 S3 前加载 |
| [`workflow-s3-writing-guide.md`](./workflow-s3-writing-guide.md) | 写稿规范 · Chapter Brief / Report Brief 格式 · 单章清单 · 评分流程 · 进度汇报格式 | 进入正式写稿时加载 |
| [`workflow-s3-closure.md`](./workflow-s3-closure.md) | 收口工件清单 · 骨架汇总 · S3→S4 进入条件 | S3 全部章节写完时加载 |

> **防卡顿原则**：每次只加载当前阶段所需子卷；禁止一次性 `read_file` 全量加载三个子卷。

## 关联文档

- [`workflow-s0.md`](./workflow-s0.md) — 原料激活与联网查证
- [`workflow-s2.md`](./workflow-s2.md) — 目录规划
- [`workflow-s2.5.md`](./workflow-s2.5.md) — 节点确认
- [`workflow-s4.md`](./workflow-s4.md) — 排版构建
- [`../05-ops/large-scale-book-strategy.md`](../../05-ops/large-scale-book-strategy.md) — 大规模书稿策略（M1/M2/M3）
