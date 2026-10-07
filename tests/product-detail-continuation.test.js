const test = require('node:test');
const assert = require('node:assert/strict');
const { createCheckpoint, resumeCheckpoint } = require('../workstation/product-detail-continuation.js');

test('creates a resumable product-detail checkpoint with current step and next action', () => {
  const checkpoint = createCheckpoint({
    projectId: 'rice-2026-11',
    product: { name: '五常大米', heroAsset: 'assets/hero.png', specification: '5kg' },
    task: '商品详情页',
    platforms: ['douyin'],
    completed: ['product-brief', 'storyboard'],
    current: 'visual-master',
    next: '完成前两屏 QA'
  });

  assert.equal(checkpoint.continuingFrom.type, 'product-detail-page');
  assert.equal(checkpoint.status, 'READY_WITH_GAPS');
  assert.equal(checkpoint.next, '完成前两屏 QA');
  assert.deepEqual(resumeCheckpoint(checkpoint).completed, ['product-brief', 'storyboard']);
});

test('blocks continuation when required product identity is missing', () => {
  const checkpoint = createCheckpoint({
    projectId: 'incomplete',
    product: { name: '待补充商品', specification: '未知' },
    task: '商品详情页',
    platforms: []
  });

  assert.equal(checkpoint.status, 'BLOCKED_IDENTITY');
  assert.deepEqual(checkpoint.missingRequired, ['product.heroAsset', 'platforms']);
  assert.equal(resumeCheckpoint(checkpoint).canContinue, false);
});

test('preserves evidence states and never upgrades unverified claims', () => {
  const checkpoint = createCheckpoint({
    projectId: 'claims',
    product: { name: '商品', heroAsset: 'hero.png', specification: '500g' },
    task: '商品详情页',
    platforms: ['tmall'],
    claims: [{ text: '权威认证', evidence: '待补证据', state: 'needs-proof' }]
  });

  assert.equal(checkpoint.claims[0].state, 'needs-proof');
  assert.equal(resumeCheckpoint(checkpoint).canUseClaimsInFinal, false);
});
