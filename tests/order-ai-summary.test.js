const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { buildOrderAiSummary } = require('../order-ai-summary.js');

test('订单 AI 摘要只保留平台、日期和金额/行数汇总', () => {
  const summary = buildOrderAiSummary({
    platform: 'douyin', date: '2026-10-06', fileCount: 3, rowCount: 28, totalAmount: 1268.5,
    fileNames: ['private-account.xlsx'], productIds: ['secret-id'], productNames: ['private product']
  });

  assert.deepEqual(summary, {
    reportType: 'order-summary', platform: 'douyin', date: '2026-10-06',
    fileCount: 3, matchedRows: 28, totalAmount: 1268.5
  });
  const serialized = JSON.stringify(summary);
  for (const privateValue of ['private-account', 'secret-id', 'private product']) assert.equal(serialized.includes(privateValue), false);
});

test('order workspace exposes explicit AI actions without replacing platform processing', () => {
  const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(page, /id="ai-order-douyin"/);
  assert.match(page, /id="ai-order-shipinhao"/);
  assert.match(page, /id="ai-order-kuaishou"/);
  assert.match(page, /OrderAiSummary\.buildOrderAiSummary/);
  assert.match(page, /fetch\('\/api\/assistant'/);
  assert.match(page, /id="btn-process-douyin"/);
  assert.match(page, /id="btn-process-shipinhao"/);
  assert.match(page, /id="btn-process-kuaishou"/);
});
