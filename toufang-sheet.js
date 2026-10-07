(function(root) {
  'use strict';

  const bottleProductIds = new Set([
    '3786992765380985563',
    '3786992599907303730',
    '3786992370092998728',
    '3786991195494941086',
    '3786991092516389228',
    '3786972748543295850'
  ]);

  function buildDouyinSheetRows(records) {
    const groups = new Map();
    for (const record of records) {
      const id = String(record.productId ?? '').trim();
      const name = String(record.productName ?? '').trim();
      if (!groups.has(id)) groups.set(id, { id, name, cost: 0, records: [] });
      const group = groups.get(id);
      if (!group.name && name) group.name = name;
      group.cost += Number(record.cost) || 0;
      group.records.push(record);
    }

    const sortedGroups = [...groups.values()].map(group => ({
      ...group,
      packaging: bottleProductIds.has(group.id) || /320\s*ml\s*[x×*]\s*6\s*瓶装/i.test(group.name) ? '瓶装' : '罐装',
      productTotal: group.cost
    })).sort((a, b) => {
      const categoryOrder = (a.packaging === '罐装' ? 0 : 1) - (b.packaging === '罐装' ? 0 : 1);
      return categoryOrder || b.productTotal - a.productTotal || a.id.localeCompare(b.id, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN');
    });

    const rows = [['包装', '商品ID', '商品名称', '日期', '整体消耗', '总消耗']];
    let previousPackaging = '';
    for (const group of sortedGroups) {
      group.records.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.source).localeCompare(String(b.source), 'zh-CN'));
      group.records.forEach((record, index) => rows.push([
        index === 0 && group.packaging !== previousPackaging ? group.packaging : '',
        index === 0 ? group.id : '',
        index === 0 ? group.name : '',
        dateLabel(record.date),
        Number(record.cost) || 0,
        index === 0 ? group.cost : ''
      ]));
      previousPackaging = group.packaging;
    }
    return rows;
  }

  function buildPlatformSummaryRows(records) {
    const totals = new Map();
    for (const record of records) {
      const row = totals.get(record.platform) || { platform: record.platform, cost: 0, sales: 0, orders: 0 };
      row.cost += Number(record.cost) || 0;
      row.sales += Number(record.sales) || 0;
      row.orders += Number(record.orders) || 0;
      totals.set(record.platform, row);
    }
    const rows = [['平台', '消耗（元）', '成交金额（元）', '订单数', 'ROI', '转化成本（元）']];
    const summaries = [...totals.values()].sort((a, b) => a.platform.localeCompare(b.platform, 'zh-CN'));
    const grand = summaries.reduce((sum, row) => ({
      platform: '合计', cost: sum.cost + row.cost, sales: sum.sales + row.sales, orders: sum.orders + row.orders
    }), { platform: '合计', cost: 0, sales: 0, orders: 0 });
    for (const row of [...summaries, grand]) rows.push([
      row.platform, row.cost, row.sales, row.orders,
      row.cost ? row.sales / row.cost : '—', row.orders ? row.cost / row.orders : '—'
    ]);
    return rows;
  }

  function buildAiSummary(records, scope, dateFrom, dateTo) {
    const totals = new Map();
    for (const record of records) {
      const row = totals.get(record.platform) || { platform: record.platform, cost: 0, sales: 0, orders: 0 };
      row.cost += Number(record.cost) || 0;
      row.sales += Number(record.sales) || 0;
      row.orders += Number(record.orders) || 0;
      totals.set(record.platform, row);
    }
    const metrics = row => ({
      platform: row.platform,
      cost: row.cost,
      sales: row.sales,
      orders: row.orders,
      roi: row.cost ? row.sales / row.cost : null,
      costPerOrder: row.orders ? row.cost / row.orders : null
    });
    const platforms = [...totals.values()].sort((a, b) => a.platform.localeCompare(b.platform, 'zh-CN')).map(metrics);
    const total = metrics(platforms.reduce((sum, row) => ({
      platform: '合计', cost: sum.cost + row.cost, sales: sum.sales + row.sales, orders: sum.orders + row.orders
    }), { platform: '合计', cost: 0, sales: 0, orders: 0 }));
    return { scope, dateFrom: dateFrom || null, dateTo: dateTo || null, platforms, total };
  }

  function syncUploadButton(button, fileCount) {
    if (!button) return;
    button.hidden = fileCount < 1;
    button.disabled = fileCount < 1;
  }

  function excludeAllDateRows(rows, getDate) {
    const filtered = rows.filter(row => String(getDate(row) ?? '').trim() !== '全部');
    return { rows: filtered, excluded: rows.length - filtered.length };
  }

  function rowIndexAtY(rowBounds, y) {
    if (!rowBounds.length) return -1;
    for (const row of rowBounds) {
      if (y >= row.top && y < row.bottom) return row.index;
    }
    if (y < rowBounds[0].top) return rowBounds[0].index;
    if (y >= rowBounds[rowBounds.length - 1].bottom) return rowBounds[rowBounds.length - 1].index;
    return -1;
  }

  function expandRowRangeForMergedCells(mergedCells, start, end, colStart, colEnd) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const cell of mergedCells) {
        const cellEnd = cell.row + cell.rowspan - 1;
        if (cell.col < colStart || cell.col > colEnd || cell.rowspan < 2 || cell.row > end || cellEnd < start) continue;
        const nextStart = Math.min(start, cell.row);
        const nextEnd = Math.max(end, cellEnd);
        if (nextStart !== start || nextEnd !== end) {
          start = nextStart;
          end = nextEnd;
          changed = true;
        }
      }
    }
    return { start, end };
  }

  function dateLabel(value) {
    const match = String(value ?? '').match(/^\d{4}-(\d{2})-(\d{2})$/);
    return match ? `${Number(match[1])}-${Number(match[2])}` : value;
  }

  root.ToufangSheet = { buildAiSummary, buildDouyinSheetRows, buildPlatformSummaryRows, excludeAllDateRows, expandRowRangeForMergedCells, rowIndexAtY, syncUploadButton };
  if (typeof module !== 'undefined') module.exports = root.ToufangSheet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
