# 贡献与发布

本项目由 Codex 维护整体架构、核心业务逻辑和测试，由豆包协助视觉和局部页面修改。

开始修改前请阅读：

- [DOUBAO_WORKFLOW.md](DOUBAO_WORKFLOW.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/PR_CHECKLIST.md](docs/PR_CHECKLIST.md)

标准流程：

1. 从最新的 main 创建独立分支。
2. 只修改本次需求涉及的文件。
3. 在本地或 GitHub Actions 中运行测试。
4. 创建 Pull Request 并等待检查通过。
5. 用户在预览版本中确认后再合并。
6. 合并后检查 GitHub Pages 正式网址。

不要提交 Excel、CSV、密码、生成报告或本地绝对路径。不要直接向 main 推送。main 是 GitHub Pages 的正式发布来源。
