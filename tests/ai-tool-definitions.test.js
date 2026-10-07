const test = require('node:test');
const assert = require('node:assert/strict');
const { getToolDefinitions } = require('../server/tool-definitions.js');

test('publishes strict read-only function definitions for the model', () => {
  const definitions = getToolDefinitions();
  assert.deepEqual(definitions.map(tool => tool.name), ['read_baseline', 'read_profile', 'read_project']);
  assert.ok(definitions.every(tool => tool.type === 'function' && tool.strict === true));
  assert.ok(definitions.every(tool => !/write|delete|publish|send/i.test(tool.name)));
});
