# AGENTS.md

## Project purpose

This repository is a browser-local e-commerce data workstation published with GitHub Pages. It processes user-selected files in the browser and does not upload those files to a server.

## Architecture and file ownership

- `index.html`: order-summary entry page, platform upload areas, order parsing, aggregation, export, and the local Automa trigger for the投放数据一键下载 button.
- `qianchuan.html`: independent 千川 analysis page, local Excel upload, filters, report rendering, and HTML export.
- `qianchuan.js`: 千川 parsing, validation, deduplication, date handling, aggregation, and analysis rules. Treat this as business logic.
- `sheet.html`: online table display and export.
- `tests/qianchuan.test.js`: dependency-free analysis-rule tests.
- `tests/qianchuan-page.test.js`: page rendering, filtering, and escaping tests.
- `docs/`: architecture, collaboration, release, and acceptance documentation.
- Local Automa workflow JSON files are user-machine configuration. They are not part of this repository unless the user explicitly requests versioning them.

## Non-negotiable boundaries

- Do not modify the previously deferred issue about order-summary results differing from Feishu tables.
- Do not add scraping, server-side uploads, automatic account access, or new credentials unless the user explicitly requests it.
- Keep file processing local to the browser.
- Do not commit Excel/CSV files, passwords, tokens, generated reports, local paths, or test data containing user information.
- Do not replace `index.html` wholesale. Preserve existing order parsing, date detection, aggregation, decryption, and export logic when changing layout or entry points.
- Do not rewrite `qianchuan.js` for visual work. Any business-rule change must include focused tests.
- Preserve the independent 千川 page boundary. Changes to the 千川 UI must not remove the order-summary modules.
- Do not change the Automa public identifier `toufang` from the website trigger without updating the local workflow and verifying the end-to-end trigger.

## Collaboration workflow

- Work on a feature/fix branch; never push directly to `main`.
- Codex owns architecture, business logic, security-sensitive file handling, and cross-page interfaces.
- Doubao may change visual design and local UI behavior on a separate branch, but must preserve the file ownership and boundaries above.
- One PR should have one focused purpose. Do not mix visual restyling with data-rule changes.
- Before merging, test the PR preview and wait for the user to confirm behavior.
- If two branches touch the same business-logic area, stop and resolve the conflict deliberately; do not overwrite one branch with an older full file.

## Required validation

Run:

```bash
node --test tests/*.test.js
```

For changes involving `index.html` or `qianchuan.html`, manually verify:

1. The page opens on GitHub Pages.
2. Existing order upload and summary flows still work.
3. The 千川 entry opens independently.
4. Multiple Excel files and multiple dates can be selected.
5. Date/account/search filters update the displayed report.
6. HTML/Excel export still works.
7. No secrets or user files are embedded in the generated output.

For the local Automa one-click download integration, verify that exactly one installed workflow uses public ID `toufang`, that the button opens the intended Qianchuan page, and that the selected date appears in the downloaded filename.

## Change discipline

Prefer the smallest change that satisfies the request. Before editing, identify the owning file and the existing entry point. After editing, inspect the diff, run the full test command, and report changed files, verification, and any limitation.

## Optional development tools

Playwright-based browser verification and Context7 documentation lookup may be used when available. They supplement the required tests; they do not replace the repository test command or manual acceptance checks.
