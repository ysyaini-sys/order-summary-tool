const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('shared workspace stylesheet defines a left sidebar and mobile fallback', () => {
  const stylesheet = fs.readFileSync(path.join(root, 'workspace.css'), 'utf8');

  assert.match(stylesheet, /\.workspace-shell/);
  assert.match(stylesheet, /\.workspace-sidebar/);
  assert.match(stylesheet, /\.workspace-main/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)/);
});

test('order workspace contains only the three order platforms', () => {
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.match(page, /href="workspace\.css"/);
  assert.match(page, /class="workspace-sidebar"/);
  assert.match(page, /id="upload-douyin"/);
  assert.match(page, /id="upload-shipinhao"/);
  assert.match(page, /id="upload-kuaishou"/);
  assert.match(page, /href="detail-page\.html"/);
  assert.match(page, /id="ks-password"/);
  assert.doesNotMatch(page, /id="upload-summary"/);
  assert.doesNotMatch(page, /id="btn-automa-toufang"/);
});

test('ad summary is an independent local-file workspace', () => {
  const page = fs.readFileSync(path.join(root, 'toufang.html'), 'utf8');

  assert.match(page, /href="workspace\.css"/);
  assert.match(page, /class="workspace-sidebar"/);
  assert.match(page, /id="date-from"/);
  assert.match(page, /id="date-to"/);
  assert.match(page, /id="summarize"/);
  assert.match(page, /id="export"/);
  assert.match(page, /id="explain-ai"/);
  assert.match(page, /id="ai-analysis"/);
  assert.match(page, /buildAiSummary\(lastRows, lastScope, lastStart, lastEnd\)/);
  assert.match(page, /汇总条件已变化，请重新汇总/);
  assert.match(page, /fetch\('\/api\/assistant',[\s\S]*?method: 'POST'/);
  assert.match(page, /AI 解读仅发送平台汇总指标与日期范围/);
  assert.match(page, /id="btn-automa-toufang"/);
  assert.match(page, /automa:execute-workflow/);
  assert.match(page, /publicId:\s*'toufang'/);
  assert.match(page, /浏览器本地处理/);
  assert.doesNotMatch(page, /id="ks-password"/);
  assert.doesNotMatch(page, /id="upload-douyin"/);
});

test('qianchuan keeps its analyzer while using the independent workspace shell', () => {
  const page = fs.readFileSync(path.join(root, 'qianchuan.html'), 'utf8');

  assert.match(page, /href="workspace\.css"/);
  assert.match(page, /class="workspace-sidebar"/);
  assert.match(page, /src="qianchuan\.js"/);
  assert.match(page, /id="files"/);
  assert.doesNotMatch(page, /<nav class="workspace-nav"/);
  assert.doesNotMatch(page, /<header class="hero"/);
});
