# order-summary-tool
电商订单汇总工具：数据汇总、抖音、视频号、快手订单按商品汇总

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
| `index.html` | 仅新增分析页面链接，原订单与投放汇总逻辑保持原样 |
| `qianchuan.html` | 上传、附件报告布局、筛选与独立 HTML 导出 |
| `qianchuan.js` | 将附件 PowerShell 的读取后处理规则移植为独立 JavaScript 模块 |
| `tests/qianchuan.test.js` | 无额外依赖的分析规则测试 |
| `tests/qianchuan-page.test.js` | 报告渲染、筛选和转义测试 |

压缩包中的 `运行分析.cmd → analyze.ps1 → report-template.html → qianchuan-report.html` 流程，替换为 `选择文件 → SheetJS → Qianchuan.analyze → 报告展示/导出`。原脚本依赖 PowerShell 与 .NET ZIP/XML，默认路径写死为 `D:\千川商品分析工具\分析文件`，与其使用说明中的下载目录描述不同；网页集成不依赖这一路径。附件自带 Excel 和已生成的业务报告不进入仓库。

运行测试：`node --test tests/*.test.js`（Node 18+，无需安装包）。本次不涉及此前搁置的订单汇总与飞书表格结果差异。

## 开发与测试

本项目使用分支和 Pull Request 协作。不要直接向 `main` 推送；Codex 和豆包各自使用独立分支，测试通过并经用户确认后再合并。

本地测试命令：

```bash
node --test tests/*.test.js
```

GitHub Actions 会在每个面向 `main` 的 Pull Request 和每次合并到 `main` 后自动运行同一组测试。GitHub Pages 只从 `main` 发布正式网站。

协作规则见 [DOUBAO_WORKFLOW.md](DOUBAO_WORKFLOW.md)，架构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，合并前检查见 [docs/PR_CHECKLIST.md](docs/PR_CHECKLIST.md)。
