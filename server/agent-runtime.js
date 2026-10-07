const { executeToolCall } = require('./tool-executor.js');

async function runWithTools(client, request, registry, { maxTurns = 4 } = {}) {
  const input = typeof request.input === 'string' ? [{ role: 'user', content: request.input }] : [...request.input];
  for (let turn = 0; turn < maxTurns; turn += 1) {
    const response = await client.respond({ ...request, input });
    const calls = (response.output || []).filter(item => item.type === 'function_call');
    if (!calls.length) return response;
    input.push(...response.output);
    for (const call of calls) {
      let output;
      try { output = executeToolCall(registry, call); }
      catch (error) { output = { error: error.message }; }
      input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) });
    }
  }
  throw new Error('tool-call limit reached before a final response');
}

module.exports = { runWithTools };
