# 电商工作台 Easel 式完整工作流设计

## 目标

在个人电商工作台中融入 Easel 的持续 Agent、Profile、Project、Skills、内容生产、人工确认发布准备和效果复盘思路。商品详情页是内容生产中的一个 Skill，不代表整体范围。

## 依据与范围

Easel 的公开说明把工作流概括为发现、策划、创作、发布和归因，并以持续 Agent、账号画像、可执行 Skills 与项目归档串联。此处只借鉴工作流和边界设计，不复制 Easel 实现，也不替换现有工作台。

本仓库已有订单汇总、投放汇总、千川分析、回归基线、Profile / Projects 示例、AI 助手和商品详情页 checkpoint。改造从这些能力外围增量扩展。

## 约束

1. 订单、投放、千川现有计算、文件读取、导出和通知链路不得被新内容工作流接管或改口径。
2. 不部署云端 AI；Agent 适配器只在本机服务端运行，支持本机 OpenClaw 的 OpenAI-compatible Responses 接口或现有 OpenAI API 配置。
3. API Key / Gateway token 仅从服务端环境变量读取，不写入网页、Profile、Project、日志或仓库。
4. AI 只能读取用户主动提供的 Profile、Project、checkpoint 和经用户明确触发的汇总指标；不得扫描或上传本地原始订单、投放、千川文件。
5. Agent 默认只读。发布、账号登录、投放修改、通知、删除、订单变更均不自动执行；发布阶段先生成预览、平台检查表和可导出稿，由用户手动确认。
6. 用户内容、生成物和账号资料属于本地数据；示例之外的运行数据不得提交到 GitHub。
7. 每个流程步骤都要保存状态、输入来源、输出版本、下一步和继续来源，使 `Continuing from` 可用于整个内容项目，而非只用于商品详情页。

## 设计

### 1. 连续工作流

内容项目统一经过 `discover → plan → produce → review → publish → learn` 六个阶段。阶段可按项目类型略过，但必须记录跳过原因；`learn` 只产出画像更新建议，不自动覆盖 Profile。商品详情页、短视频脚本、平台文案、创意简报和内容质检均为 `produce` 或 `review` 阶段的独立 Skill。

Project 的 `workflow` 使用 `currentStage`、`nextAction`、`continuingFrom` 和 `stages` 字段；每个阶段记录 `status`（`pending` / `in_progress` / `complete` / `skipped`）、用户备注、来源说明和更新时间。`skipped` 必须包含原因。版本化输出留在 `outputs` / `ai-results` 下，并通过项目元数据引用，不混入 Profile。

### 2. Profile 与 Project

Profile 保存店铺/账号定位、目标受众、品牌风格、平台约束、禁用表达、已核验声明规则和可选长期经验。Project 保存商品/活动背景、来源材料索引、当前流程阶段、checkpoint、生成版本、人工审核状态、发布记录及效果复盘摘要。凭据、Cookie、原始业务文件不得放入这两类数据。

### 3. Skill 注册

Skills 使用仓库内可审查的静态清单定义名称、所属阶段、输入要求、输出格式、风险级别和人工审核要求。首批 Skill 覆盖商品详情页、短视频脚本、平台文案适配、创意/素材简报、内容质量检查、发布前检查和效果复盘。未配置 AI 时仍可浏览流程、填写信息、保存 checkpoint、复制/导出草稿；AI 调用须如实报告不可用状态。

### 4. 本机 Agent 接入

本机 Node 服务仍绑定 loopback，不开放公网。Agent 客户端支持配置 OpenAI-compatible base URL、模型和服务端 token；OpenClaw 通过本机 Gateway 的 Responses 兼容端点接入。保留当前 OpenAI 默认端点行为。服务健康状态只公开 provider 类型和是否已配置，不返回 URL 中的凭据或 token。

### 5. 发布与复盘

本阶段只提供平台适配预览、发布检查清单、人工确认状态和表现数据录入/摘要建议。不得模拟发布成功、自动登录平台或自动调整账户画像。经营分析页面现有结果可由用户主动选择的聚合指标提供复盘上下文；不允许后台读取原始文件。

### 6. 数据安全与回归

本地 Project/outputs 和私有 Profile 数据默认忽略 Git 跟踪，仅保留脱敏示例。项目 ID、Profile ID、Skill ID、流程阶段和输入大小必须做白名单/长度校验。测试覆盖状态流转、断点恢复、版本归档、拒绝路径穿越、只读工具、provider 缺失/失败和旧工作区回归。

## 验收标准

- 用户可从工作台入口打开内容中心，建立/选择 Profile 和 Project，查看六阶段进度。
- 一个 Project 可从发现推进到复盘；每步有保存、恢复和明确的下一步提示。
- 商品详情页只是可选 Skill；同一工作流还可创建短视频脚本、平台文案、创意简报、质量检查和复盘建议。
- 无 AI 配置时，非 AI 流程仍可使用；AI 操作显示明确的未连接说明，不伪造结果。
- 配置本机 OpenClaw 时，服务端可调用其 Responses 兼容端点；配置现有 OpenAI provider 的行为继续可用。
- 任何发布动作必须由用户人工完成；服务不访问或存储平台登录凭据。
- 新运行数据不会进入 Git 跟踪；示例保持可测试。
- `node --test tests/*.test.js` 全绿，且回归覆盖既有订单、投放、千川页面。

## 不在本阶段

- 把完整 Easel 项目或其数十个媒体/发布 Skills 移植进仓库。
- 自动登录或自动发布到抖音、天猫、拼多多等平台。
- 云端部署 AI 服务或创建第三方托管资源。
- 自动抓取趋势、账户、广告报表或外部网站。
- 自动修改 Profile、订单、投放设置、通知目标或原始经营数据。
