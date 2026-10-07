const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createToolRegistry } = require('../server/tool-registry.js');

const root = path.join(__dirname, '..');

test('tool registry exposes only bounded read tools', () => {
  const tools = createToolRegistry({ root });
  assert.deepEqual(tools.list().sort(), ['read_baseline', 'read_profile', 'read_project']);
  assert.equal(tools.canWrite, false);
  assert.equal(tools.list().some(name => /write|save|publish|delete/i.test(name)), false);
});

test('reads the example project without allowing path traversal', () => {
  const tools = createToolRegistry({ root });
  const project = tools.call('read_project', { projectId: 'example' });
  assert.equal(project.id, 'example-project');
  assert.equal(project.continuation.task, '商品详情页');
  assert.throws(() => tools.call('read_project', { projectId: '../package.json' }), /invalid project/i);
});
