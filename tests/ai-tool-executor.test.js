const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { executeToolCall } = require('../server/tool-executor.js');
const { createToolRegistry } = require('../server/tool-registry.js');

test('executes only registered read tool calls', () => {
  const registry = createToolRegistry({ root: path.join(__dirname, '..') });
  const result = executeToolCall(registry, { name: 'read_baseline', arguments: '{}' });
  assert.ok(Array.isArray(result.checks));
  assert.throws(() => executeToolCall(registry, { name: 'write_project', arguments: '{}' }), /unknown tool/i);
});
