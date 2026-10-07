const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { buildAiSummary, buildDouyinSheetRows, buildPlatformSummaryRows, excludeAllDateRows, expandRowRangeForMergedCells, rowIndexAtY, syncUploadButton } = require('../toufang-sheet.js');

test('AI explanation summary aggregates metrics only and omits raw report details', () => {
  const summary = buildAiSummary([
    { platform: '抖音投放数据', cost: 100, sales: 250, orders: 10, productId: 'sku-1', source: 'private.xlsx' },
    { platform: '抖音投放数据', cost: 50, sales: 100, orders: 5, productId: 'sku-2', source: 'private.xlsx' },
    { platform: '快手投放数据', cost: 0, sales: 10, orders: 0, productId: 'sku-3', source: 'another.xlsx' }
  ], 'all', '2026-09-01', '2026-09-30');

  assert.deepEqual(summary, {
    scope: 'all', dateFrom: '2026-09-01', dateTo: '2026-09-30',
    platforms: [
      { platform: '抖音投放数据', cost: 150, sales: 350, orders: 15, roi: 350 / 150, costPerOrder: 10 },
      { platform: '快手投放数据', cost: 0, sales: 10, orders: 0, roi: null, costPerOrder: null }
    ],
    total: { platform: '合计', cost: 150, sales: 360, orders: 15, roi: 2.4, costPerOrder: 10 }
  });
  assert.equal(JSON.stringify(summary).includes('private.xlsx'), false);
  assert.equal(JSON.stringify(summary).includes('sku-1'), false);
});

test('Douyin online sheet keeps screenshot-style daily rows under merged product groups', () => {
  const rows = buildDouyinSheetRows([
    { productId: 'can-low', productName: '果汁罐装', date: '2026-09-28', cost: 10, source: 'account-a.xlsx' },
    { productId: 'bottle', productName: '葡萄汁320ml*6瓶装', date: '2026-09-28', cost: 100, source: 'account-a.xlsx' },
    { productId: 'can-high', productName: '白桦汁罐装', date: '2026-09-28', cost: 20, source: 'account-a.xlsx' },
    { productId: 'can-high', productName: '白桦汁罐装', date: '2026-09-28', cost: 30, source: 'account-b.xlsx' },
    { productId: 'can-high', productName: '白桦汁罐装', date: '2026-09-29', cost: 5, source: 'account-a.xlsx' }
  ]);

  assert.deepEqual(rows[0], ['包装', '商品ID', '商品名称', '日期', '整体消耗', '总消耗']);
  assert.deepEqual(rows.slice(1), [
    ['罐装', 'can-high', '白桦汁罐装', '9-28', 20, 55],
    ['', '', '', '9-28', 30, ''],
    ['', '', '', '9-29', 5, ''],
    ['', 'can-low', '果汁罐装', '9-28', 10, 10],
    ['瓶装', 'bottle', '葡萄汁320ml*6瓶装', '9-28', 100, 100]
  ]);
});

test('指定的六个商品ID强制归类为瓶装', () => {
  const bottleIds = [
    '3786992765380985563', '3786992599907303730', '3786992370092998728',
    '3786991195494941086', '3786991092516389228', '3786972748543295850'
  ];
  const rows = buildDouyinSheetRows(bottleIds.map(productId => ({
    productId, productName: '名称未包含瓶装字样', date: '2026-09-28', cost: 1
  })));

  assert.deepEqual(rows.slice(1).map(row => row[1]), bottleIds.slice().sort());
  assert.deepEqual(rows.slice(1).map(row => row[0]).filter(Boolean), ['瓶装']);
});

test('online sheet detects and merges the five-column product ad layout', () => {
  const page = fs.readFileSync(path.join(__dirname, '../sheet.html'), 'utf8');
  assert.match(page, /productAdSummary/);
  assert.match(page, /shouldMerge\(rows, c, r, type\)/);
  assert.match(page, /\[0, 1, 2\]/);
  assert.match(page, /productAdSummary:\s*\['text','id','text','text','dec','dec'\]/);
  assert.match(page, /\[0, 1, 2, 5\]/);
});

test('online sheet copies styled HTML tables as well as plain text', () => {
  const page = fs.readFileSync(path.join(__dirname, '../sheet.html'), 'utf8');
  assert.match(page, /function writeRichClipboard\(/);
  assert.match(page, /'text\/html'/);
  assert.match(page, /new ClipboardItem\(/);
  assert.match(page, /writeRichClipboard\(text, html/);
  assert.doesNotMatch(page, /navigator\.clipboard\.writeText\(text\)/);
});

test('drag selection resolves the visible row beneath vertically merged cells', () => {
  const rows = [
    { index: 0, top: 0, bottom: 20 },
    { index: 1, top: 20, bottom: 40 },
    { index: 2, top: 40, bottom: 60 },
    { index: 3, top: 60, bottom: 80 }
  ];
  assert.equal(rowIndexAtY(rows, 50), 2);
  assert.equal(rowIndexAtY(rows, 80), 3);
  const page = fs.readFileSync(path.join(__dirname, '../sheet.html'), 'utf8');
  assert.match(page, /addEventListener\('mousemove'/);
  assert.match(page, /rowIndexAtY\(tableRows, event\.clientY\)/);
  const paintSelection = page.match(/function paintSel\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(paintSelection, /getCellRC\(td,\s*e\)/);
  assert.match(page, /id="selection-indicator"/);
  assert.match(page, /selection-indicator.*已选/s);
  assert.match(page, /expandRowRangeForMergedCells\(mergedCells/);
  assert.match(page, /selEffectiveRMin >= 0 \? selEffectiveRMin/);
});

test('selection expands to include complete merged cells within selected columns', () => {
  const mergedCells = [
    { row: 1, col: 0, rowspan: 8 },
    { row: 2, col: 1, rowspan: 3 },
    { row: 2, col: 5, rowspan: 3 }
  ];
  assert.deepEqual(expandRowRangeForMergedCells(mergedCells, 3, 6, 0, 5), { start: 1, end: 8 });
  assert.deepEqual(expandRowRangeForMergedCells(mergedCells, 3, 6, 3, 4), { start: 3, end: 6 });
});

test('other platform online sheets contain aggregate rows and a total, not source details', () => {
  const rows = buildPlatformSummaryRows([
    { platform: '抖音投放数据', cost: 100, sales: 250, orders: 10, source: 'a.xlsx', date: '9-28' },
    { platform: '抖音投放数据', cost: 50, sales: 100, orders: 5, source: 'b.xlsx', date: '9-28' }
  ]);

  assert.deepEqual(rows, [
    ['平台', '消耗（元）', '成交金额（元）', '订单数', 'ROI', '转化成本（元）'],
    ['抖音投放数据', 150, 350, 15, 350 / 150, 10],
    ['合计', 150, 350, 15, 350 / 150, 10]
  ]);
  assert.equal(rows.some(row => row.includes('a.xlsx') || row.includes('b.xlsx')), false);
});

test('Douyin upload card exposes its online summary action after files are selected', () => {
  const page = fs.readFileSync(path.join(__dirname, '../toufang.html'), 'utf8');
  assert.match(page, /data-online-sheet="douyin"/);
  assert.match(page, /online-sheet-button/);
  assert.match(page, /buildDouyinSheetRows/);
});

test('Douyin online summary button appears only while upload files are present', () => {
  const button = { hidden: true, disabled: true };

  syncUploadButton(button, 1);
  assert.equal(button.hidden, false);
  assert.equal(button.disabled, false);

  syncUploadButton(button, 0);
  assert.equal(button.hidden, true);
  assert.equal(button.disabled, true);
});

test('投放数据汇总在指标统计前剔除日期为全部的源行', () => {
  const input = [
    { 日期: '全部', 整体消耗: 500 },
    { 日期: '2026-09-28', 整体消耗: 25 },
    { 日期: ' 全部 ', 整体消耗: 500 }
  ];
  const result = excludeAllDateRows(input, row => row.日期);

  assert.deepEqual(result.rows, [input[1]]);
  assert.equal(result.excluded, 2);
  const page = fs.readFileSync(path.join(__dirname, '../toufang.html'), 'utf8');
  assert.match(page, /excludeAllDateRows\(data,/);
});
