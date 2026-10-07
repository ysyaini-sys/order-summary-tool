const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadBaseline, evaluateBaseline } = require('../workstation/baseline.js');

const root = path.join(__dirname, '..');

test('loads a baseline with repository and manual checks', () => {
  const baseline = loadBaseline();
  assert.ok(baseline.checks.some(check => check.id === 'orders-entrypoints'));
  assert.ok(baseline.checks.some(check => check.id === 'account-capture-completeness'));
  assert.ok(baseline.checks.some(check => check.id === 'top-spend-input'));
});

test('evaluates required files and preserves manual-required checks', () => {
  const results = evaluateBaseline(root);
  assert.equal(results.find(result => result.id === 'orders-entrypoints').status, 'pass');
  assert.equal(results.find(result => result.id === 'account-capture-completeness').status, 'manual-required');
  assert.equal(results.find(result => result.id === 'top-spend-input').status, 'manual-required');
});

test('reports a missing required file instead of silently passing', () => {
  const baseline = loadBaseline();
  const result = evaluateBaseline(root, {
    baseline: { ...baseline, checks: [...baseline.checks, { id: 'missing', type: 'file', path: 'missing.file' }] }
  }).find(item => item.id === 'missing');
  assert.equal(result.status, 'fail');
});

test('profile and project examples remain valid and outside page dependencies', () => {
  for (const file of ['profiles/example/profile.json', 'projects/example/project.json']) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')));
  }
  for (const page of ['index.html', 'toufang.html', 'qianchuan.html']) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert.doesNotMatch(source, /(?:profiles|projects)\//);
  }
});
