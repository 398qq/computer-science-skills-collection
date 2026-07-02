# EVAL — 个人评估

> fork of [bighardperson/computer-science-skills-collection](https://github.com/bighardperson/computer-science-skills-collection)
> 创建时间：2026-07-02 | 上游：610 skills（`SKILL.md` / `skill.md`）
> 用途：知识库参考 + 按需挑选二次开发。**不直接安装到 `~/.hermes/skills/`**

## 1. 整体结构

```
.
├── README.md              # 上游首页
├── CATALOG.md             # 全部 610 skill 索引（搜索用）
├── CONTRIBUTING.md
├── LICENSE_NOTICE.md
├── docs/
│   ├── LEARNING_ROADMAP.md
│   ├── USAGE.md
│   ├── SHARE_COPY.md
│   └── categories/        # 9 大分类索引
│       ├── programming.md              (124)
│       ├── frontend-mobile-ui.md       (146)
│       ├── backend-cloud-api.md        ( 70)
│       ├── ai-agent-models.md          (104)
│       ├── data-algorithms-research.md ( 52)
│       ├── browser-search-automation.md( 18)
│       ├── security-quality.md         ( 10)
│       ├── docs-office-content.md      ( 28)
│       └── workflow-others.md         ( 58)
├── scripts/
│   └── build_docs.py     # 自动生成 docs/categories/*.md
└── skills/                # 610 原始 skill 目录
```

## 2. 跟本机 Hermes skills 的重叠度

本机 `~/.hermes/skills/` 已有约 80+ skills，**两类**：

### 2.1 完全重复（无需装）
| 上游 skill | 已有 Hermes skill | 状态 |
|---|---|---|
| `ArXiv论文追踪` / `arxiv-watcher` | `research:arxiv` | 已覆盖 |
| `Apple提醒事项` / `apple-reminders` | `openclaw-imports:xiaohongshu-auto-operation` 内的同款 | 已覆盖 |
| `AI绘图` / `AI图像生成` | `creative:comfyui` + `baoyu-image-gen` | 已覆盖 |
| `YouTube` 类 | `media:youtube-content` + `baoyu-youtube-transcript` | 已覆盖 |
| `PowerPoint` | `productivity:powerpoint` | 已覆盖 |
| `Notion` | `productivity:notion` | 已覆盖 |
| `Spotify` | `media:spotify` | 已覆盖 |
| `ArXiv论文精读` | `note-taking:scholar` | 已覆盖 |

→ 估算 **~35~50% 直接重复**。

### 2.2 真有补点
- `ai-agent-models.md` 里有**证券/金融/polymarket** 相关 skill（不重复）
- `browser-search-automation.md` 有 **OSINT / reconnaissance / 浏览器指纹规避** skill
- `data-algorithms-research.md` 里有 **量化研究 / paper-trading** 类
- `security-quality.md` 有 **antivirus / skill 安全审计** skill（值得单独装）
- `workflow-others.md` 里有 **auto-updater / capability-evolver**（自进化引擎）

→ 详细精选见 [`MY_PICKS.md`](./MY_PICKS.md)。

## 3. 这个 fork 的使用方式

1. **检索**：`Ctrl+F` `CATALOG.md` 找关键词
2. **看**：直接看 `skills/<name>/SKILL.md` 的触发条件、命令、参考资料
3. **抄**：复制单 skill 到 `~/.hermes/skills/<custom-name>/SKILL.md`，按 Hermes SKILL 规范改写 frontmatter
4. **追新**：通过本仓库配的 `.github/workflows/sync-upstream.yml` 每周自动同步

## 4. 注意事项

- 上游是「awesome-list 风格」整理，**质量参差**——大部分是真好用的，少部分是凑数
- **不是工具**——所有 skill 都是 prompt 模板/工作流文档，**没有可执行代码**（除少部分 `scripts/build_docs.py`）
- 部分 skill 跟 OpenClaw 深度绑定（如 `auto-updater`），搬到 Hermes 需要重写触发机制
- **谨慎信任**「antivirus」类 skill——它扫描的是 OpenClaw 自己的 skills 仓库，搬过来之前先看清楚它扫描什么、判定什么

## 5. 同步机制

- 配了 `.github/workflows/sync-upstream.yml`，每周一 UTC 04:00 自动 fetch upstream/main
- Fast-forward 成功 → 直接 push
- Fast-forward 失败（本地有上游没有的 commit，如本文件）→ 开 PR 提示人工 review
- 冲突策略：`-X ours` 保留本仓库的 `EVAL.md` / `MY_PICKS.md` / `sync-upstream.yml`
