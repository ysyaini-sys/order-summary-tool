# 个人电商工作站页面架构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将订单汇总、投放数据汇总和千川商品分析整理为共享左侧导航下的三个独立工作区。

**Architecture:** 新增一个只处理页面框架与视觉的 `workspace.css`。订单、投放与千川各自保留业务代码与数据状态；导航只负责跳转，千川使用新标签页打开。投放汇总从订单页移至独立 `toufang.html`，不再共享订单表单或计算逻辑。

**Tech Stack:** 静态 HTML、CSS、浏览器原生 JavaScript、SheetJS 0.20.3、Node 内建测试。

**Spec:** `docs/superpowers/specs/2026-09-28-workstation-information-architecture-design.md`

## Global Constraints

- 不修改订单汇总与飞书表格结果差异。
- 不增加后端、抓取、账号登录、服务器上传或新的运行时依赖。
- 原始文件与快手密码只在浏览器本地处理。
- 不整页替换 `qianchuan.js`，保留其读取、筛选、报告导出规则。
- GitHub Pages 只从 `main` 发布；所有代码先提交至本分支的 PR。
- 左侧导航只显示订单汇总、投放数据汇总、千川商品分析；快手不是独立导航。
- 千川链接使用新标签页，订单和投放在当前标签页切换。
- 页面不显示大幅宣传标题、重复导航、虚构 KPI 或趋势数据。

## Review Focus

- 快手加密订单在新布局中仍能找到密码框并触发原有解密流程；Task 2 的页面结构测试锁定 `ks-password` 和快手上传区。
- 订单页不再保留投放上传区或“投放数据汇总”脚本入口；Task 2 的页面结构测试锁定移除结果。
- 投放页只接受本地 Excel/CSV，并在缺失识别字段时显示提示；Task 3 的测试锁定独立上传及状态容器。
- 千川在独立标签页打开，`qianchuan.js` 与导出脚本仍被加载；Task 4 的测试锁定这两个接口。
- 窄屏下左侧导航不能遮挡文件上传内容；Task 1 的样式测试锁定移动端折叠规则。

### Task 1: 共用页面框架与回归测试

**Files:**
- Create: `workspace.css`
- Create: `tests/workspace-layout.test.js`

**Interfaces:**
- Produces: `.workspace-shell`、`.workspace-sidebar`、`.workspace-main`、`.workspace-page-heading` 四个稳定的布局类。
- Produces: 三个页面共同使用的侧栏链接 HTML 约定。

- [ ] **Step 1: 写入失败的页面结构测试**

测试读取三个 HTML 文件，断言每页引用 `workspace.css`，侧栏只有三条业务导航；订单页不含 `upload-summary` 与 `btn-automa-toufang`；千川仍含 `qianchuan.js`。

- [ ] **Step 2: 运行页面结构测试，确认在改版前失败**

Run: `node --test tests/workspace-layout.test.js`

Expected: FAIL，因为当前页面没有 `workspace.css` 或侧栏结构。

- [ ] **Step 3: 实现 `workspace.css`**

定义浅灰画布、固定窄左栏、当前导航态、内容区、上传卡片、按钮和 760px 以下的顶部折叠导航。样式不得定义或依赖任何业务 ID。

- [ ] **Step 4: 运行页面结构测试，确认基础框架通过**

Run: `node --test tests/workspace-layout.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add workspace.css tests/workspace-layout.test.js
git commit -m "style: add shared workstation shell"
```

### Task 2: 订单汇总页面收口

**Files:**
- Modify: `index.html`
- Test: `tests/workspace-layout.test.js`

**Interfaces:**
- Consumes: Task 1 的 `workspace.css` 和侧栏约定。
- Produces: 只含抖音、视频号、快手订单上传与汇总的 `index.html`。

- [ ] **Step 1: 扩展失败测试**

断言订单页含三条订单上传区与 `ks-password`，不含投放汇总卡片、下载入口和相关投放事件绑定。

- [ ] **Step 2: 运行测试，确认当前订单页仍混有投放功能**

Run: `node --test tests/workspace-layout.test.js`

Expected: FAIL，现有首页含投放数据汇总卡片。

- [ ] **Step 3: 调整 `index.html` 页面外壳并移除投放模块**

在订单上传卡片外加入侧栏和简短页面标题；删除投放汇总的 HTML、上传状态和只服务投放汇总的脚本。保留抖音、视频号、快手的 ID、文件读取、日期识别、快手解密、汇总、下载和在线表格函数。

- [ ] **Step 4: 运行订单与页面结构测试**

Run: `node --test tests/*.test.js`

Expected: PASS，现有订单/千川测试与新增结构测试均通过。

- [ ] **Step 5: 提交**

```bash
git add index.html tests/workspace-layout.test.js
git commit -m "refactor: isolate order summary workspace"
```

### Task 3: 独立投放数据汇总页

**Files:**
- Create: `toufang.html`
- Test: `tests/workspace-layout.test.js`

**Interfaces:**
- Consumes: Task 1 的共用布局和 SheetJS CDN。
- Produces: 与订单页面不共享上传文件、日期、结果或导出状态的投放汇总页。

- [ ] **Step 1: 扩展失败测试**

断言 `toufang.html` 存在，含独立日期范围、平台范围、上传区、汇总按钮、导出按钮和本地处理提示，并不包含订单密码输入或订单上传 ID。

- [ ] **Step 2: 运行测试，确认独立投放页尚不存在**

Run: `node --test tests/workspace-layout.test.js`

Expected: FAIL，因为 `toufang.html` 不存在。

- [ ] **Step 3: 实现 `toufang.html`**

提供抖音、视频号、快手、其他投放报表的独立文件列表；按页面选择的全部或单个平台和日期范围过滤；仅计算文件中可识别的消耗、成交金额、订单数、ROI、转化成本；导出独立明细。遇到无法识别字段时在页面状态区提示，而不影响订单页。

- [ ] **Step 4: 运行页面结构测试**

Run: `node --test tests/workspace-layout.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add toufang.html tests/workspace-layout.test.js
git commit -m "feat: add independent ad summary workspace"
```

### Task 4: 千川分析页面接入侧栏

**Files:**
- Modify: `qianchuan.html`
- Test: `tests/workspace-layout.test.js`

**Interfaces:**
- Consumes: Task 1 的共用布局和现有 `qianchuan.js`。
- Produces: 新标签页中的千川独立工作区。

- [ ] **Step 1: 扩展失败测试**

断言千川页使用共用侧栏、页面标题和 `qianchuan.js`，且不含旧的银灰波纹大横幅与重复 `workspace-nav`。

- [ ] **Step 2: 运行测试，确认旧标题和导航仍存在**

Run: `node --test tests/workspace-layout.test.js`

Expected: FAIL。

- [ ] **Step 3: 调整 `qianchuan.html` 的页面外壳**

替换旧导航及巨幅标题为侧栏和简短标题；保留文件导入、筛选、报告、导出元素的 ID、脚本引用和导出时移除导航的逻辑。

- [ ] **Step 4: 运行全部测试**

Run: `node --test tests/*.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add qianchuan.html tests/workspace-layout.test.js
git commit -m "style: align qianchuan with workspace navigation"
```

### Task 5: 文档和发布验证

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`

**Interfaces:**
- Consumes: 完成后的三个页面路径与导航行为。
- Produces: 与实际网站一致的使用说明和架构图。

- [ ] **Step 1: 更新使用说明和架构文档**

将入口改为三个独立工作区，明确千川新标签页、投放独立汇总和浏览器本地处理。

- [ ] **Step 2: 运行完整测试和静态页面检查**

Run: `node --test tests/*.test.js`

Expected: PASS。

Run: `python3 -m http.server 8766 --directory .`

Expected: 三个页面可被本地服务器提供；手工检查侧栏切换、文件选择和按钮可见。

- [ ] **Step 3: 提交并创建可预览 PR**

```bash
git add README.md docs/ARCHITECTURE.md
git commit -m "docs: describe independent workspaces"
```
