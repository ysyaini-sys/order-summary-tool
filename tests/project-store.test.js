const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createProjectStore } = require('../server/project-store.js');

test('archives AI result versions and updates continuation metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-project-'));
  fs.mkdirSync(path.join(root, 'projects', 'demo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'projects', 'demo', 'project.json'), JSON.stringify({ id: 'demo' }));
  fs.writeFileSync(path.join(root, 'projects', 'demo', 'continuation.json'), JSON.stringify({ current: 'storyboard' }));
  const store = createProjectStore({ root });
  const saved = store.saveAIResult('demo', { skill: 'product-detail', output: 'QA 建议' });
  assert.equal(saved.version, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'demo', 'continuation.json'))).lastAISkill, 'product-detail');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'demo', 'ai-results', 'v1.json'))).output, 'QA 建议');
});

test('creates a new project from its checkpoint when archiving the first AI result', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-new-project-'));
  const store = createProjectStore({ root });
  const saved = store.saveAIResult('rice-2026', {
    skill: 'product-detail', output: 'Brief',
    project: { id: 'rice-2026', name: '五常大米' },
    continuation: { task: '商品详情页', next: '制作首屏' }
  });
  assert.equal(saved.version, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'rice-2026', 'project.json'))).id, 'rice-2026');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'rice-2026', 'continuation.json'))).next, '制作首屏');
});
