# order-summary-tool
个人电商数据工作站：订单汇总、投放数据汇总和千川商品分析。

## 使用入口

- `index.html`：订单汇总。上传抖音、视频号或快手订单文件；快手密码只在此页面使用。每个平台汇总完成后，可主动请求 AI 解读平台、日期、有效文件数、匹配行数和成交金额。
- `toufang.html`：投放数据汇总。上传投放报表，按全部或单个平台、日期范围汇总消耗、成交金额、订单数、ROI 和转化成本；用户主动点击「AI 解读汇总」后，可将平台汇总指标交给 AI 分析。
- `qianchuan.html`：千川商品分析。由左侧导航在独立标签页打开；在用户主动点击后，可让 AI 解读当前筛选商品汇总与匿名账户指标。
- `detail-page.html`：商品详情页项目工作台。支持商品身份门禁、Continuing from、页面蓝图、步骤进度、checkpoint 保存/恢复/导入/导出。

三个页面都只读取本地文件，在浏览器内处理；它们不共享已上传文件、计算结果或导出数据。

投放 AI 解读只提交当前汇总的平台、消耗、成交金额、订单数、ROI、转化成本及日期范围，不提交商品 ID、商品名称、文件名或原始行；改变日期、平台或文件后须重新汇总。AI 功能需通过本地服务访问，可使用服务端配置的 `OPENAI_API_KEY`，也可连接本机 OpenClaw Gateway；未配置时会明确提示，不会生成伪造结果。

千川 AI 解读仅提交当前筛选商品的汇总金额、商品行数、去重商品数、ROI、匿名账户序号及日期/筛选状态；搜索词本身、商品/素材名称与 ID、账户名称、文件名和原始明细不提交。离线 HTML 报告不包含 AI 面板。

订单 AI 解读只提交平台、日期、有效文件数、匹配行数和成交金额；不提交商品 ID、规格、商品名、订单明细、源文件名或快手密码。订单行数不等于订单数，AI 提示中明确了这一口径限制。

商品详情页工作台是独立的增量模块，不读取订单、投放或千川上传数据。商品名称、主体图、规格和目标平台缺失时会标记为 `BLOCKED_IDENTITY`；未核验卖点会保留证据状态，不自动进入最终成稿。

## 电商内容中心与本机 AI

新增的电商内容中心覆盖 `发现 → 策划 → 生产 → 审核 → 发布准备 → 复盘`。商品详情页只是其中一个 Skill；选品与趋势、短视频脚本、直播话术、社媒文案、素材审核、发布准备和内容复盘也有独立入口。Profile、Project 和产物作为外围增量模块，不替换订单、投放、千川的既有页面和计算链路。服务默认只监听本机回环地址；可沿用 OpenAI，也可本机连接 OpenClaw Gateway 的 OpenAI-compatible Responses 接口，见 [server/README.md](server/README.md)。

接入本机 OpenClaw 示例（凭据仅存在服务端环境中）：

```bash
export OPENAI_BASE_URL='http://127.0.0.1:18789/v1'
export OPENAI_MODEL='openclaw/default'
export OPENCLAW_GATEWAY_TOKEN='你的本机 Gateway token'
node server/index.js
```

此配置不等于部署 AI 或工作台到云端。发布、账号操作和对外投放仍由用户手动执行；无 AI 时，内容项目的本地查看、整理与保存仍可用。

## 千川商品分析

在首页点击「千川商品分析」，选择本地 Excel 后点击「开始分析」。支持一次选择多个账户、日期和商品/视频文件；每次分析替换当前报告，不会累加上次上传。无需抓取、自动下载、Windows 脚本或后端服务。Excel 内容在浏览器内处理，不上传服务器；页面通过与首页相同的 SheetJS 0.20.3 CDN 加载解析库，首次打开需要网络。

### 文件格式与口径

- 文件名：`账户_YYYY-MM-DD_乘方-商品-商品数据明细.xlsx` 或 `账户_YYYY-MM-DD_乘方-商品-素材-视频.xlsx`，日期也支持 `YYYY-MM-DD至YYYY-MM-DD`。
- 读取第一个工作表，第一行为列名。公共必需列：`日期`、`综合成本`、`净成交金额`、`综合营销ROI`。商品还需 `商品ID`、`商品名称`；视频还需 `素材ID`、`素材视频名称`，可选 `素材创建时间`。
- 日期以数据行中的日期为准，排除「全部」行。ID 应在 Excel 中保存为文本，超出安全整数范围的数字 ID 会被拒绝，以免错误合并。
- 总览只累计商品综合成本与净成交金额，ROI = 净成交金额合计 / 综合成本合计，成本为零时显示「—」。视频单独汇总，不重复计入商品总额。
- 相同维度、账户、日期和 ID 只保留文件修改时间较新的记录；时间相同按文件名排序，文件内相同键采用最后一行。金额冲突会提示。
- 沿用附件规则：商品成本或金额缺失时排除该行；素材缺失指标保留为空并显示「—」。无效日期、缺列、损坏文件等显示在「数据检查」。
- 支持日期/账户筛选、名称或 ID 搜索、账户对比、商品和素材投入前五以及明细。「下载 HTML 报告」包含本次全部分析数据，可离线打开并筛选；报告不包含上传模块或外部脚本。

### 集成结构

| 文件 | 用途 |
| --- | --- |
| `index.html` | 订单汇总页面；包含抖音、视频号、快手订单逻辑 |
| `toufang.html` | 独立投放数据汇总页面；不复用订单计算逻辑 |
| `qianchuan.html` | 上传、附件报告布局、筛选与独立 HTML 导出 |
| `qianchuan.js` | 将附件 PowerShell 的读取后处理规则移植为独立 JavaScript 模块 |
| `workspace.css` | 三个页面共用的左侧导航和响应式页面框架 |
| `tests/qianchuan.test.js` | 无额外依赖的分析规则测试 |
| `tests/qianchuan-page.test.js` | 报告渲染、筛选和转义测试 |

压缩包中的 `运行分析.cmd → analyze.ps1 → report-template.html → qianchuan-report.html` 流程，替换为 `选择文件 → SheetJS → Qianchuan.analyze → 报告展示/导出`。原脚本依赖 PowerShell 与 .NET ZIP/XML，默认路径写死为 `D:\千川商品分析工具\分析文件`，与其使用说明中的下载目录描述不同；网页集成不依赖这一路径。附件自带 Excel 和已生成的业务报告不进入仓库。

运行测试：`node --test tests/*.test.js`（Node 18+，无需安装包）。本次不涉及此前搁置的订单汇总与飞书表格结果差异。

## 开发与测试

### 本地 AI 工作台

AI 助手和商品详情页 AI 功能通过本地 Node 服务访问。进入仓库根目录后，在终端设置服务端环境变量 `OPENAI_API_KEY` 并运行 `node server/index.js`，然后打开 `http://127.0.0.1:8787/`。不要把密钥写入 HTML、浏览器脚本或项目 JSON。没有配置密钥时服务仍可打开页面，但 AI 请求会明确提示未配置。

服务端提供只读 Profile / Project / 基线工具；模型请求的商品详情页上下文必须包含商品名称、主体图、规格和目标平台。AI 结果按版本存入项目 `ai-results/`，并更新 `continuation.json`。

本项目使用分支和 Pull Request 协作。不要直接向 `main` 推送；Codex 和豆包各自使用独立分支，测试通过并经用户确认后再合并。

本地测试命令：

```bash
node --test tests/*.test.js
```

GitHub Actions 会在每个面向 `main` 的 Pull Request 和每次合并到 `main` 后自动运行同一组测试。GitHub Pages 只从 `main` 发布正式网站。

协作规则见 [DOUBAO_WORKFLOW.md](DOUBAO_WORKFLOW.md)，架构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，合并前检查见 [docs/PR_CHECKLIST.md](docs/PR_CHECKLIST.md)。
