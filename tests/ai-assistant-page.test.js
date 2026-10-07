const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'ai-assistant.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'ai-assistant.js'), 'utf8');

test('AI assistant page exposes task, continuation context and response controls', () => {
  for (const id of ['project-id', 'profile-id', 'load-context', 'quick-product-brief', 'quick-blueprint', 'quick-qa', 'assistant-task', 'project-context', 'send-task', 'clear-history', 'assistant-status', 'assistant-response', 'conversation-history']) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(script, /fetch\('\/api\/assistant'/);
  assert.match(page, /商品详情页/);
  assert.match(script, /history/);
});

test('product detail page can request AI guidance and display the returned result', () => {
  const detailPage = fs.readFileSync(path.join(root, 'detail-page.html'), 'utf8');
  const detailScript = fs.readFileSync(path.join(root, 'detail-page.js'), 'utf8');
  assert.match(detailPage, /id="ask-ai"/);
  assert.match(detailPage, /id="ai-result"/);
  assert.match(detailScript, /fetch\('\/api\/assistant'/);
  assert.match(detailScript, /textContent = body\.response/);
});
