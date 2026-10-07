# 工作站 V2 第一阶段回归基线

## 自动门禁

在仓库根目录运行：

```text
node --test tests/*.test.js
```

所有仓库内自动测试必须通过。`tests/workstation-baseline.test.js` 同时检查入口文件、分析脚本、既有测试覆盖、导出安全，以及 Profile / Projects 不侵入现有页面。

## 现有功能检查

| 项目 | 自动状态 | 验证标准 | 证据 |
| --- | --- | --- | --- |
| 订单汇总 | 自动 | 抖音、视频号、快手入口存在；快手密码只在订单页 | 测试输出 |
| 投放数据汇总 | 自动 | 独立页面、日期筛选、导出和平台汇总测试存在 | 测试输出 |
| 千川商品分析 | 自动 | 商品/视频分离、去重、`全部` 行排除、长 ID、缺失指标、零成本口径 | 测试输出 |
| 导出安全 | 自动 | 用户输入转义，导出数据不注入 `script` 结束标签 | 测试输出 |
| Profile / Projects 隔离 | 自动 | 示例 JSON 有效，现有页面不引用新目录 | 测试输出 |
| 商品详情页工作台 | 自动 | 独立入口、身份门禁、checkpoint 续接、蓝图和步骤状态可验证 | 测试输出 |
| 内容中心/Profile/Project | 自动 | 无 AI 可建 Profile/Project、读写六阶段 checkpoint、恢复旧样例 ID、导出项目 JSON | `tests/content-center.test.js`、`tests/project-store.test.js` |
| 六阶段 Skill 路由 | 自动 | 发现/策划/生产/审核/发布准备/复盘均有注册 Skill；详情页只是一个生产 Skill | `tests/content-skills.test.js`、`tests/agent-router.test.js` |
| 本机 AI 接入 | 自动 | OpenAI 默认行为不变；OpenClaw-compatible endpoint 可配；健康/错误响应不泄露 token 或地址 | `tests/openai-client.test.js`、`tests/ai-workstation.test.js` |
| 旧工作区入口 | 自动 | 订单、投放、千川、详情页和 AI 助手保留原入口，并新增内容中心导航 | `tests/workspace-layout.test.js`、`tests/content-center.test.js` |

## 必须在真实运行环境补做

| 项目 | 状态 | 验证标准 | 当前风险 |
| --- | --- | --- | --- |
| 账户抓取完整性 | manual-required | 多账户、多日期输入逐一出现在结果中；漏抓时明确报警 | 当前仓库没有账户抓取运行时 |
| 十大消耗对比 | manual-required | 输入缺失或读取失败时显示失败项，不生成伪造排名 | 当前仓库没有该功能实现 |
| 千川整点盯盘 | not-applicable-to-repo | 在原工作站运行环境验证定时任务和失败重试 | 当前仓库不含运行时 |
| 通知 / 推送 | not-applicable-to-repo | 验证成功、失败、空数据通知链路 | 当前仓库不含通知实现 |
| 云端运行 | not-applicable-to-repo | 验证部署、定时任务、日志和恢复 | 当前仓库不含云端配置 |
| MCP 数据链路 | not-applicable-to-repo | 验证只读工具、错误返回和报告链路 | 当前仓库不含 MCP 实现 |

## 合并规则

自动项有一项失败就不能视为第一阶段完成。人工项在没有真实运行证据前保持未完成，不得以页面测试替代。

新增内容中心的回归不替代或降低上方既有订单、投放、千川的测试；这三条原链路仍需在每次改动后全量运行 `node --test tests/*.test.js`。本地 AI/内容流程测试也不能代替整点盯盘、通知推送、云端运行、MCP 和账户抓取的真实环境验收；这些在当前仓库仍标记为 `not-applicable-to-repo` 或 `manual-required`。
