# MY_PICKS — 个人精选

> 挑选原则：贴合 **IC 电子元器件经销 + 工业无人机 + GNSS 导航 + 终端客户** 的工作流；
> 跟本机 `~/.hermes/skills/` **不重复** 或 **值得参考其写法** 的。
> 标注：**🔴 强烈推荐** / **🟡 值得抄写法** / **⚪ 标记不装**

---

## 一、强相关 — 业务/技术栈

| Skill | 路径 | 推荐度 | 为什么值得装 |
|---|---|---|---|
| `electron-component-search` 思路（参考分类索引） | `docs/categories/programming.md` | ⚪ | 这仓库**没直接给电子元器件查价 skill**，但 `AdMapix` / `stock-research-engine` 是同类数据/价格聚合 prompt 模板——抄它们的「输出去重+多源交叉验证」结构自己写一个 |
| `aviation-weather` | `skills/aviation-weather/SKILL.md` | 🔴 | 工业无人机客户做飞行测试时 METAR/TAF 拉取，**现成可用**——4 个命令就直接拿到气象 |
| `trading212-api` | `skills/trading212-api/SKILL.md` | 🟡 | 不是我行业的，但「REST API + 仓位同步 + 告警」的 prompt 模式可以**直接抄**用来对接 ERP/MES |
| `us-stock-analysis` / `a-stock-market` / `stock-research-engine` | `skills/` | ⚪ | 跟我的业务**无关**，但他们的「数据→分析→输出」流水线**值得抄** |
| `automate-excel` | `skills/automate-excel/SKILL.md` | 🔴 | **BOM/报价单**离不开 Excel，**现成可用**——`.xlsx/.xls` 读写、合并、校验、CSV 互转全覆盖 |
| `finance-ops` | `skills/finance-ops/SKILL.md` | 🟡 | 财务工作流模板，**抄其命令编排**给应收账款/客户对账用 |

## 二、OSINT / 客户调研

| Skill | 路径 | 推荐度 | 为什么 |
|---|---|---|---|
| `deep-research` | `skills/deep-research/SKILL.md` | 🔴 | 多步骤深度调研 prompt（**直接对应「查客户背景/查竞品」场景**），跟 OpenClaw 自带 aliens-eye 互补 |
| `agentlens` | `skills/agentlens/SKILL.md` | 🔴 | 接手**新客户的 codebase 调研**神器——层级化文档导航、找模块、定位符号、找 TODO |
| `Brave Search` 系列 | `skills/brave-search/SKILL.md` | ⚪ | 跟现有 web search 重叠，但**有 content extraction** 是补点 |
| `wechat-article-search` / `fetch-wx-article` | `skills/` | 🔴 | 微信生态查**客户公众号/同行文章**——现成，国内 OSINT 必备 |
| `boss-skills` | `skills/boss-skills/SKILL.md` | 🟡 | 客户/老板画像生成 prompt，**抄其 MBTI + 决策模式模板**写客户关系维护 |

## 三、自动化 / 浏览器 / 安全

| Skill | 路径 | 推荐度 | 为什么 |
|---|---|---|---|
| `agent-browser` / `Browser (Puppeteer)` / `Playwright Browser Automation` / `Stagehand Browser CLI` | `skills/` | 🟡 | **任选一个**深入——浏览器自动化是查客户公司、批量抓分销商信息的核心能力。**Stagehand Browser CLI** 是当下最优（Microsoft Playwright） |
| `Stealth Browser` | `skills/Stealth Browser/SKILL.md` | 🔴 | 反指纹 + 隐匿浏览，**查客户网站不被封**的刚需 |
| `browser-cash` / `Browser.cash` | `skills/browser-cash/SKILL.md` | 🟡 | 走 Cloudflare/DataDome 反爬的云浏览器，**备用** |
| `antivirus` | `skills/antivirus/SKILL.md` | 🔴 | **装到 `~/.hermes/skills/` 必装**——扫本机所有 skill 找 ClickFix / reverse shell / 数据外泄 |
| `skill-auditor` / `agent-skills-audit` | `skills/` | 🔴 | 装新 skill 前先审计，**双保险** |
| `anti-distill` | `skills/anti-distill/SKILL.md` | 🟡 | 清理 skill 防止核心知识被蒸馏——保护**代理品牌 + 客户清单 + 价格策略**这种核心资产时用 |
| `security-auditor` / `security-audit-toolkit` | `skills/` | 🟡 | 安全审计通用工具，**抄其检查清单**给客户做 BOM 风险评估 |

## 四、Agent / 自我进化

| Skill | 路径 | 推荐度 | 为什么 |
|---|---|---|---|
| `Agent Team Orchestration` | `skills/Agent Team Orchestration/SKILL.md` | 🔴 | **多 agent 协作**写工作流，复杂客户询价 → 报价 → 跟进 → 复盘的 pipeline 都可以用 |
| `capability-evolver` | `skills/capability-evolver/SKILL.md` | 🟡 | AI Agent 自进化引擎——**研究价值高**，但跟 EvoMap Hub 通信有外部依赖，**标记不装先观察** |
| `autoresearch` | `skills/autoresearch/SKILL.md` | 🟡 | Karpathy 风格的自动优化：50+ 变体、5 专家打分、多轮进化——**抄其打分维度**做我自己的报价优化 |
| `auto-updater` | `skills/auto-updater/SKILL.md` | ⚪ | Clawdbot 专用，Hermes 已经有自己的更新机制，**不装** |

## 五、内容生产 / 客户沟通

| Skill | 路径 | 推荐度 | 为什么 |
|---|---|---|---|
| `baoyu-markdown-to-html` | `skills/baoyu-markdown-to-html/SKILL.md` | ⚪ | 跟现有 baoyu-skills 重叠 |
| `content-factory` / `content-repurposer` | `skills/` | 🟡 | 一稿多投——**技术资料 / 客户邮件 / 公众号 / 朋友圈**适配，**抄其 multi-format 输出逻辑** |
| `book-writer` / `book-notes` | `skills/` | 🟡 | 长篇技术文档 / 客户培训材料——**抄其大纲→扩写流程** |
| `wechatpay-basic-payment` | `skills/wechatpay-basic-payment/SKILL.md` | 🟡 | 客户在线下单收款的 prompt 模板 |

## 六、跟现有 Hermes 完全重复的（**不装**）

| 上游 skill | 已有 Hermes skill |
|---|---|
| `arxiv-watcher` / `ArXiv论文追踪` | `research:arxiv` |
| `apple-reminders` / `Apple提醒事项` | 已有 |
| `AI绘图` / `AI图像生成` | `creative:comfyui` + `baoyu-image-gen` |
| `YouTube` 系列 | `media:youtube-content` + `baoyu-youtube-transcript` |
| `PowerPoint` 系列 | `productivity:powerpoint` |
| `Notion` 系列 | `productivity:notion` |
| `Spotify` 系列 | `media:spotify` |
| `ArXiv论文精读` | `note-taking:scholar` |
| `Baidu Search` / `Brave Search` | `research:blogwatcher` + Hermes 自带 web search |
| `Blogwatcher` | `research:blogwatcher` 已覆盖 |
| `Airtable` | `productivity:airtable` 已覆盖 |
| `Linear` | `productivity:linear` 已覆盖 |
| `Polymarket` | `research:polymarket` 已覆盖 |
| `YouTube transcript` | `baoyu-youtube-transcript` 已覆盖 |

---

## 行动建议（**给我的执行清单**）

1. **立刻装**（覆盖盲点、零风险）：
   - `antivirus`
   - `skill-auditor` 或 `agent-skills-audit`（二选一）
   - `aviation-weather`
   - `automate-excel`
   - `fetch-wx-article` + `wechat-article-search`
   - `Stealth Browser`
   - `deep-research`
   - `agentlens`

2. **不装但**抄写法到自己 aierp 项目里：
   - `Agent Team Orchestration` → 写「询价→报价→跟进」三 agent pipeline
   - `trading212-api` / `us-stock-analysis` → 抄「REST 同步 + 异常告警」结构
   - `autoresearch` → 抄「5 专家打分」做自己的报价优化
   - `boss-skills` → 抄「MBTI + 决策画像」做客户分类

3. **不装**（重复 / 与 OpenClaw 深度绑定 / 风险未明）：
   - 所有跟现有 Hermes skills 重复的（见上表）
   - `capability-evolver`（等观察再决定）
   - `auto-updater`（Hermes 已有）
   - `browser-cash`（需付费，按需）

4. **永远不装**：
   - 任何 `OpenClaw Clawdbot` 深度绑定的 skill（除非准备迁移到 OpenClaw）
   - 任何需要上传我工作目录到外部 Hub 的 skill（如 `capability-evolver`）
