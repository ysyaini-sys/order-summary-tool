# Workstation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`[ ]`) syntax for tracking.

**Goal:** Add safe version/status visibility and homepage smoke checks without changing business calculations or local file-processing behavior.

**Architecture:** Keep the static multi-page architecture. Add a small shared metadata block and local status update around the existing Automa event, then add dependency-free source checks that protect the homepage entry points.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-28-workstation-foundation-design.md`

## Global Constraints

- Keep GitHub Pages static.
- Keep Excel, CSV, passwords, and decryption local to the browser.
- Preserve the existing `toufang` Automa public ID.
- Do not change order, Qianchuan, or Kuaishou business rules.
- Do not commit local Automa JSON files or user data.
- Do not address the deferred Feishu reconciliation issue.

## Review Focus

- The one-click download event must still dispatch `publicId: 'toufang'`.
- A missing status element must not break the existing click handler.
- Version metadata must appear on both pages without entering analysis data.
- Homepage smoke checks must catch a full-page overwrite that removes an upload area or Qianchuan link.
- Existing Qianchuan tests must continue to pass.

---

### Task 1: Add workstation metadata and status UI

**Files:**
- Modify: `index.html` (metadata constants, header/footer/status markup, Automa click handler)
- Modify: `qianchuan.html` (matching metadata display)
- Test: `tests/workstation-pages.test.js`

**Interfaces:**
- Produces `WORKSTATION_VERSION` and `WORKSTATION_UPDATED_AT` page metadata.
- Preserves the existing `automa:execute-workflow` event contract.

- [ ] **Step 1: Write failing source checks** for the metadata, status copy, and `toufang` contract.
- [ ] **Step 2: Run the new test and verify it fails because the metadata/status checks are absent.**
- [ ] **Step 3: Add the smallest markup and script changes in both pages.**
- [ ] **Step 4: Run the focused test and verify it passes.**
- [ ] **Step 5: Commit with `feat: add workstation version and download status`.**

### Task 2: Add homepage smoke coverage

**Files:**
- Modify: `tests/workstation-pages.test.js`

**Interfaces:**
- Consumes the source files from Task 1.
- Produces dependency-free checks for page entry points and upload areas.

- [ ] **Step 1: Add assertions for the four order platform areas, the Qianchuan link, and the Kuaishou upload/decryption entry.**
- [ ] **Step 2: Run the focused test and verify it passes.**
- [ ] **Step 3: Run `node --test tests/*.test.js` and verify the full suite passes.**
- [ ] **Step 4: Commit with `test: protect workstation page entry points`.**

### Task 3: Browser smoke verification and review

**Files:**
- Modify: `README.md` only if the final user-facing test instructions need updating.

- [ ] **Step 1: Use Playwright MCP to load the static homepage and verify the navigation, upload areas, version badge, and one-click status element.**
- [ ] **Step 2: Inspect the diff for accidental business-logic changes.**
- [ ] **Step 3: Run the full Node test suite again.**
- [ ] **Step 4: Open a PR with the changed files, test results, and the limitation that real accounts/downloads remain manual acceptance.**

