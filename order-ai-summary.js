(function(root) {
  'use strict';

  function buildOrderAiSummary({ platform, date, fileCount, rowCount, totalAmount } = {}) {
    const allowedPlatforms = new Set(['douyin', 'shipinhao', 'kuaishou']);
    const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    return {
      reportType: 'order-summary',
      platform: allowedPlatforms.has(platform) ? platform : 'other',
      date: String(date || ''),
      fileCount: Math.max(0, Math.trunc(safeNumber(fileCount))),
      matchedRows: Math.max(0, Math.trunc(safeNumber(rowCount))),
      totalAmount: Math.max(0, safeNumber(totalAmount))
    };
  }

  root.OrderAiSummary = { buildOrderAiSummary };
  if (typeof module !== 'undefined') module.exports = root.OrderAiSummary;
})(typeof globalThis !== 'undefined' ? globalThis : this);
