const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'detail-page.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'detail-page.js'), 'utf8');

test('商品详情页工作台 exposes identity, continuation and checkpoint controls', () => {
  for (const id of ['project-id', 'continuing-source', 'product-name', 'hero-asset', 'specification', 'platform', 'current-step', 'next-step', 'save-checkpoint', 'resume-checkpoint', 'export-checkpoint', 'import-checkpoint']) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /BLOCKED_IDENTITY/);
  assert.match(page, /continuingFrom/);
  assert.match(page, /core-claim/);
  assert.match(page, /evidence-state/);
  assert.match(page, /completed-step/);
  assert.match(page, /page-blueprint/);
  assert.match(script, /downloadCheckpoint/);
  assert.match(script, /importCheckpoint/);
  assert.match(script, /projectId/);
});

test('checkpoint script blocks incomplete identity and saves a resumable record', () => {
  const storage = new Map();
  const context = {
    localStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) || null },
    document: { getElementById: () => ({ value: '', textContent: '' }) }
  };
  vm.runInNewContext(`${script}\nthis.ProductDetailPage = { buildCheckpoint, applyCheckpoint };`, context);
  const blocked = context.ProductDetailPage.buildCheckpoint({ productName: '', heroAsset: '', specification: '', platform: '' });
  assert.equal(blocked.status, 'BLOCKED_IDENTITY');
  assert.deepEqual(Array.from(blocked.missingRequired), ['product.name', 'product.heroAsset', 'product.specification', 'platforms']);
  const ready = context.ProductDetailPage.buildCheckpoint({ projectId: 'rice-2026', source: 'previous-task', productName: '大米', heroAsset: 'hero.png', specification: '5kg', platform: 'douyin', nextStep: '首屏 QA', coreClaim: '东北产地', evidenceState: 'needs-proof', blueprint: '首屏\n核心卖点\n购买行动', completed: ['product-brief'] });
  assert.equal(ready.status, 'READY_WITH_GAPS');
  assert.equal(ready.next, '首屏 QA');
  assert.equal(ready.projectId, 'rice-2026');
  assert.equal(ready.continuingFrom.source, 'previous-task');
  assert.equal(ready.claims[0].state, 'needs-proof');
  assert.equal(ready.canUseClaimsInFinal, false);
  assert.match(ready.blueprint, /购买行动/);
  const fields = {
    'project-id': { value: '' }, 'continuing-source': { value: '' }, 'product-name': { value: '' }, 'hero-asset': { value: '' }, specification: { value: '' },
    platform: { value: '' }, 'current-step': { value: '' }, 'next-step': { value: '' },
    'core-claim': { value: '' }, 'evidence-state': { value: '' }, 'page-blueprint': { value: '' }
  };
  fields['completed-step-product-brief'] = { checked: true };
  fields['completed-step-storyboard'] = { checked: false };
  fields['completed-step-art-direction'] = { checked: false };
  fields['completed-step-visual-master'] = { checked: false };
  fields['completed-step-qa'] = { checked: false };
  context.document.getElementById = id => fields[id];
  context.ProductDetailPage.applyCheckpoint(ready);
  assert.equal(fields['product-name'].value, '大米');
  assert.equal(fields['project-id'].value, 'rice-2026');
  assert.equal(fields['current-step'].value, 'product-brief');
  assert.equal(fields['core-claim'].value, '东北产地');
  assert.equal(fields['completed-step-product-brief'].checked, true);
  assert.match(fields['page-blueprint'].value, /购买行动/);
});
