# 使用指南

## 复制一个 skill

找到你需要的目录后，复制整个 skill 文件夹到自己的 Agent skills 目录中：

```bash
cp -R skills/<skill-name> ~/.agents/skills/
```

不同客户端的目录可能不同。你可以只复制 `SKILL.md`，也可以把 `scripts/`、`references/`、`templates/` 一起复制。

## 改造成自己的版本

建议按这个顺序改：

1. 阅读 `SKILL.md` 的 `name`、`description` 和触发条件。
2. 检查是否依赖外部命令、API Key、浏览器、Node.js、Python 或云平台。
3. 把示例路径改成自己的项目路径。
4. 删除你暂时用不到的 references，保持 skill 轻量。
5. 为常用工作流补充自己的命令和成功案例。

## 公开前检查

如果你要继续公开自己的改版，建议至少检查：

- 不要提交真实 `.env`、Token、私钥、证书、Cookie、数据库文件。
- 不要提交个人聊天记录、会话缓存、浏览器配置、临时日志。
- 如果 skill 来自第三方项目，请保留来源说明并尊重原项目协议。
- 如果 skill 调用在线服务，请在 README 中说明需要哪些环境变量。

## 重新生成目录

修改 `skills/` 之后，可以运行：

```bash
python3 scripts/build_docs.py
```

它会重新生成：

- `README.md`
- `CATALOG.md`
- `docs/categories/*.md`
- `docs/manifest.json`
