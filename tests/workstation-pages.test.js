const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const qianchuan = fs.readFileSync(path.join(root, 'qianchuan.html'), 'utf8');

test('homepage keeps platform entry points and local Automa contract', () => {
  for (const id of ['upload-summary', 'upload-douyin', 'upload-shipinhao', 'upload-kuaishou']) {
    assert.match(index, new RegExp(`id=["']${id}["']`));
  }
  assert.match(index, /qianchuan\.html/);
  assert.match(index, /automa:execute-workflow/);
  assert.match(index, /publicId:\s*['"]toufang['"]/);
  assert.match(index, /ks-password/);
});

test('workstation metadata and download status are present on both pages', () => {
  for (const page of [index, qianchuan]) {
    assert.match(page, /workstation-version/);
    assert.match(page, /2026\.09\.28/);
    assert.match(page, /workstation-updated/);
  }
  assert.match(index, /automa-status/);
  assert.match(index, /正在调用本机下载工作流/);
  assert.match(index, /已发送给 Automa，请等待下载/);
  assert.match(index, /未能触发，请确认 Automa 中只有一个 toufang 工作流/);
});
