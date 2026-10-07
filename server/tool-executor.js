function executeToolCall(registry, call) {
  if (!call || typeof call.name !== 'string') throw new Error('invalid tool call');
  let args = call.arguments || {};
  if (typeof args === 'string') args = JSON.parse(args);
  return registry.call(call.name, args);
}

module.exports = { executeToolCall };
