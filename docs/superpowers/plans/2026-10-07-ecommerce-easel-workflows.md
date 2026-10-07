# 电商工作台 Easel 式完整工作流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在保留订单、投放、千川核心链路的前提下，增加本机 Agent 驱动的电商内容全流程工作台。

**Architecture:** 使用本机静态工作台页面、受限 Node 服务、可审查的 Skill 清单和本地 Profile/Project 存储。OpenAI-compatible provider 可指向本机 OpenClaw Gateway；Agent 仅只读，发布和画像更新留给用户确认。

**Tech Stack:** Node.js 18+、内置 `node:test`、原生 HTML/CSS/JavaScript、OpenAI Responses-compatible HTTP。

**Spec:** `docs/superpowers/specs/2026-10-07-ecommerce-easel-workflows-design.md`

## Global Constraints

- 不修改现有订单、投放、千川核心计算与文件处理逻辑。
- 不部署云端 AI；本机服务继续只绑定 loopback。
- API Key / Gateway token 只通过服务端环境变量提供。
- 发布、账号登录、投放修改、通知、删除和 Profile 自动更新均需人工确认。
- 原始业务文件不离开浏览器；只可使用用户主动提供的聚合摘要。
- 私有 Profile、Project 和输出文件不得进入 Git 跟踪。
- 测试命令保持 `node --test tests/*.test.js`。

## Review Focus

- 错误阶段、缺失来源或伪造 checkpoint 不得让项目跳步；由 workflow 状态契约测试覆盖。
- 恶意/损坏的 Project ID 或持久化 JSON 不得读写仓库外路径或覆盖示例；由存储边界测试覆盖。
- OpenClaw/OpenAI 认证失败不得在响应或日志泄露密钥；由 provider 错误路径测试覆盖。
- 未连接 AI 时发现、编辑、保存和导出仍可用；由内容中心页面测试覆盖。
- 发布/复盘仅可保存人工状态和建议，不能误调用外部账号或原业务链路；由路由和工具权限测试覆盖。

### Task 1: 通用内容工作流状态机

**Files:**
- Create: `workstation/content-workflow.js`
- Test: `tests/content-workflow.test.js`

**Interfaces:**
- Produces `WORKFLOW_STAGES`, `createContentProject(input)`, `advanceContentProject(project, stage, patch)`, and `getNextContentAction(project)`.
- Stage IDs: `discover`, `plan`, `produce`, `review`, `publish`, `learn`; updates are immutable plain JSON.

- [ ] Write tests for initial state, allowed stage advance, skipped-stage reason, resumed `nextAction`, and disallowed unknown stage.
- [ ] Run `node --test tests/content-workflow.test.js`; expected: FAIL because `workstation/content-workflow.js` is missing.
- [ ] Implement the smallest pure workflow functions.
- [ ] Run `node --test tests/content-workflow.test.js` and `node --test tests/*.test.js`; expected: all focused and full tests pass.
- [ ] Commit as `feat: add resumable ecommerce content workflow`.

### Task 2: 私有 Profile/Project 与输出归档边界

**Files:**
- Modify: `server/project-store.js`
- Modify: `server/tool-registry.js`
- Create: `.gitignore`
- Modify: `tests/project-store.test.js`, `tests/ai-tools.test.js`

**Interfaces:**
- Existing `createProjectStore({ root })` remains compatible.
- Add validated Profile list/read/save and Project read/list/create/save methods for workflow state and output versions; tool registry remains read-only for Agent calls.

- [ ] Add failing tests named `lists_private_projects`, `persists_workflow_checkpoint`, `increments_output_versions`, `creates_and_saves_profile_without_secrets`, `rejects_invalid_project_ids`, `rejects_path_traversal`, and `agent_registry_remains_read_only`.
- [ ] Run `node --test tests/project-store.test.js tests/ai-tools.test.js`; expected: new assertions fail because the store lacks the requested methods and runtime data is not ignored.
- [ ] Implement project persistence under `projects/` while ignoring all non-example Profile/Project runtime data in Git.
- [ ] Keep example metadata tracked and ensure existing tests remain valid.
- [ ] Run `node --test tests/project-store.test.js tests/ai-tools.test.js` and `node --test tests/*.test.js`; expected: all pass.
- [ ] Commit as `feat: persist private content project checkpoints`.

### Task 3: OpenAI-compatible 本机 Agent provider

**Files:**
- Modify: `server/openai-client.js`
- Modify: `server/index.js`
- Modify: `server/README.md`, `README.md`
- Test: `tests/openai-client.test.js`, `tests/ai-workstation.test.js`

**Interfaces:**
- `createOpenAIClient(env, fetchImpl = fetch)` accepts `OPENAI_BASE_URL` and `OPENAI_MODEL` while preserving default OpenAI endpoint/model.
- Optional `OPENCLAW_GATEWAY_TOKEN` is used only when configured as the provider credential; health output never includes secrets.

- [x] Add tests named `uses_openai_responses_by_default`, `uses_configured_openclaw_compatible_endpoint`, `does_not_expose_provider_secrets_in_health`, and `reports_provider_http_errors_without_body`.
- [x] Run focused tests; initial red confirmed the missing endpoint/provider behavior.
- [x] Implement configurable endpoint without adding runtime dependencies or changing the tool permission model.
- [x] Document local-only setup, provider health, and secret handling; no real token is committed.
- [x] Run focused tests (12/12) and full suite (78/78); all pass.
- [x] Commit as `feat: support local OpenClaw agent endpoint`.

### Task 4: 可审查的电商 Skill 与任务路由

**Files:**
- Create: `workstation/content-skills.json`
- Modify: `server/agent-router.js`
- Modify: `server/context-builder.js`
- Modify: `server/tool-definitions.js` only if new read-only tools are required
- Test: `tests/agent-router.test.js`, `tests/content-skills.test.js`

**Interfaces:**
- `loadContentSkills(root)` returns validated static Skill definitions.
- `routeTask(input, skills)` resolves a known skill or `general` without granting any write/publish capability.

- [x] Add tests named `routes_ecommerce_tasks_to_registered_skills`, `covers_all_workflow_stages`, `rejects_duplicate_or_unbounded_skill_ids`, and `unknown_tasks_remain_general`.
- [x] Confirm initial red for missing skill catalog and route mappings.
- [x] Implement static skill definitions with deliverables, evidence rules, and stage mapping.
- [x] Run focused tests (15/15) and full suite (84/84); existing order/Qianchuan tasks retain their routes.
- [x] Commit as `feat: add ecommerce content skill registry`.

### Task 5: 内容中心与全流程入口

**Files:**
- Create: `content-center.html`, `content-center.js`
- Modify: `workspace.css`
- Modify: `index.html`, `toufang.html`, `qianchuan.html`, `detail-page.html`, `ai-assistant.html` navigation only
- Modify: `server/index.js` static allowlist and bounded content-project endpoints
- Test: `tests/content-center.test.js`, `tests/ai-workstation.test.js`, `tests/workspace-layout.test.js`

**Interfaces:**
- Content center displays Profile/Project selectors, six workflow stages, the Skill list, current checkpoint, output versions, and resume/advance controls.
- All mutations validate input and only persist local project workflow state; no publish/network action is exposed.

- [x] Add tests for page rendering, offline use, checkpoint resume/advance, profile creation, legacy navigation, safe IDs, and API reads/writes.
- [x] Confirm initial red because the page, routes, and navigation were missing.
- [x] Implement the content-center page and loopback-only local endpoints without altering legacy calculation scripts/IDs.
- [x] Run focused tests (30/30) and full suite (92/92); all pass.
- [x] Smoke-check `/`, `/toufang.html`, `/qianchuan.html`, `/detail-page.html`, `/ai-assistant.html`, and `/content-center.html`; each returns HTTP 200.
- [ ] Commit as `feat: add continuous ecommerce content center`.

### Task 6: 回归清单、文档与交付

**Files:**
- Modify: `README.md`, `docs/ARCHITECTURE.md`, `docs/REGRESSION_BASELINE.md`, `docs/PR_CHECKLIST.md`
- Modify: `.github/workflows/test.yml` only if the existing workflow does not cover the full suite.

- [x] Document the full workflow, manual-only publishing, local OpenClaw configuration, and features still requiring separately configured media/platform tools.
- [x] Run the full suite (95/95) and inspect the diff for legacy calculation changes, secret leakage, and tracked runtime user data; no core calculator changes or runtime private data are present.
- [x] Resolve independent review findings: constrain Gateway-token destinations to loopback, reject symlinked JSON records, restore the legacy "商品详情" route, and enable AI after creating the first project.
- [x] Commit as `docs: document ecommerce agent workflows`.
- [x] After user approval, push the isolated branch and open PR #16 against `main`; leave it open for preview/acceptance and do not merge.
