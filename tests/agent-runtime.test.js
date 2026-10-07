const test = require('node:test');
const assert = require('node:assert/strict');
const { runWithTools } = require('../server/agent-runtime.js');

test('runs a model-requested read tool and returns the model final response', async () => {
  const seen = [];
  const client = { async respond(request) {
    seen.push(request);
    return seen.length === 1
      ? { output: [{ type: 'function_call', name: 'read_project', call_id: 'call_1', arguments: '{"projectId":"demo"}' }] }
      : { output_text: '项目下一步是首屏 QA。', output: [{ type: 'message' }] };
  } };
  const registry = { call: (name, args) => ({ name, ...args, next: '首屏 QA' }) };
  const result = await runWithTools(client, { input: '继续项目', tools: [] }, registry);
  assert.equal(result.output_text, '项目下一步是首屏 QA。');
  assert.ok(JSON.stringify(seen[1].input).includes('首屏 QA'));
});

test('bounds tool loops to avoid repeated or runaway model calls', async () => {
  let calls = 0;
  const client = { async respond() { calls += 1; return { output: [{ type: 'function_call', name: 'read_project', call_id: `c${calls}`, arguments: '{}' }] }; } };
  await assert.rejects(runWithTools(client, { input: 'x', tools: [] }, { call: () => ({}) }, { maxTurns: 2 }), /tool-call limit/i);
  assert.equal(calls, 2);
});
