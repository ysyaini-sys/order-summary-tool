# 个人工作站 V2 第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立现有工作站的自动化回归基线、人工检查清单和 Profile / Projects 外围目录，确保新增内容不改变订单、投放和千川现有链路。

**Architecture:** 新增独立的 `workstation/` 基线模块和测试，不让现有页面依赖它；新增 `profiles/` 与 `projects/` 仅承载文档和示例元数据。自动检查只读仓库文件，真实账户抓取、十大消耗、通知、云端和 MCP 记录为人工验证项，不伪造通过。

**Tech Stack:** Node.js 18+、内置 `node:test`、CommonJS、Markdown、JSON。

**Spec:** `docs/superpowers/specs/2026-10-07-workstation-v2-phase1-design.md`

## Global Constraints

- 不修改现有订单、投放、千川页面的核心计算逻辑。
- 不新增运行时依赖和外部服务调用。
- 不把未存在于本仓库的云端、通知、MCP 或盯盘能力标记为通过。
- 自动回归命令保持 `node --test tests/*.test.js`。

## Review Focus

- 基线检查不能因为文件存在就掩盖测试入口缺失；由基线测试覆盖。
- 账户漏读必须明确暴露为失败/缺失项；由清单契约测试覆盖。
- 十大消耗输入缺失或读取失败不能产生排名；由清单契约测试覆盖。
- Profile / Projects 不能被现有页面意外加载；由依赖扫描测试覆盖。
- 人工验证项必须保持未完成状态；由回归清单测试覆盖。

### Task 1: 建立基线定义与检查器

**Files:**
- Create: `workstation/baseline.json`
- Create: `workstation/baseline.js`
- Test: `tests/workstation-baseline.test.js`

**Interfaces:**
- Produces `loadBaseline()` and `evaluateBaseline(root)`.
- Each result has `id`, `status`, `message`; statuses are `pass`, `manual-required`, `not-applicable-to-repo`, or `fail`.

- [ ] **Step 1: Write the failing tests** for loading the baseline, detecting required files, preserving manual-required items, and returning a failure when a required file is absent.
- [ ] **Step 2: Run `node --test tests/workstation-baseline.test.js` and verify it fails because the module does not exist.**
- [ ] **Step 3: Implement the minimal JSON baseline and checker with no network or user-file access.**
- [ ] **Step 4: Run the focused test and verify it passes.**
- [ ] **Step 5: Commit the baseline module and tests.**

### Task 2: Lock regression contracts for current pages and analyses

**Files:**
- Modify: `tests/workstation-baseline.test.js`
- Create: `docs/REGRESSION_BASELINE.md`

**Interfaces:**
- The baseline test must assert the existing three page entry points, local-only processing, current analyzer test coverage, and safe export behavior.

- [ ] **Step 1: Add failing assertions for the six required current-workstation contracts and the explicit account-missing / top-spend-input-missing checks.**
- [ ] **Step 2: Run the focused test and verify any failure is caused by a missing contract, not a test typo.**
- [ ] **Step 3: Add the checklist document with pass criteria, evidence fields, and manual-required items for account completeness, top-ten spend, hourly watch, notifications, cloud runtime, and MCP.**
- [ ] **Step 4: Implement only the smallest checker metadata needed to make repository-observable assertions pass.**
- [ ] **Step 5: Run the focused test and verify it passes.**
- [ ] **Step 6: Commit the regression baseline.**

### Task 3: Add isolated Profile and Projects scaffolding

**Files:**
- Create: `profiles/README.md`
- Create: `profiles/example/profile.json`
- Create: `projects/README.md`
- Create: `projects/example/project.json`
- Modify: `tests/workstation-baseline.test.js`

**Interfaces:**
- Example metadata is documentation-only and must not be imported by `index.html`, `toufang.html`, or `qianchuan.html`.

- [ ] **Step 1: Add a failing test that asserts both example metadata files are valid JSON and no current page references either directory.**
- [ ] **Step 2: Run the focused test and verify it fails before the scaffolding exists.**
- [ ] **Step 3: Add minimal documented schemas and examples with stable IDs and no secrets.**
- [ ] **Step 4: Run the focused test and verify it passes.**
- [ ] **Step 5: Commit the isolated scaffolding.**

### Task 4: Run the full regression gate and document residual risk

**Files:**
- Modify: `docs/REGRESSION_BASELINE.md`
- Modify: `.github/workflows/test.yml` only if the current workflow does not run `node --test tests/*.test.js`.

- [ ] **Step 1: Run `node --test tests/*.test.js` and inspect the complete result.**
- [ ] **Step 2: Run the baseline checker test again and verify all repository-observable checks pass.**
- [ ] **Step 3: Record unverified manual-required areas and the next-stage recommendation in the regression document.**
- [ ] **Step 4: Inspect the final diff for unintended changes to existing runtime files.**
- [ ] **Step 5: Commit the phase as a separate change set.**

