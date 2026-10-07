function getToolDefinitions() {
  return [
    { type: 'function', name: 'read_baseline', description: '读取工作台回归基线，只读。', parameters: { type: 'object', properties: {}, additionalProperties: false }, strict: true },
    { type: 'function', name: 'read_profile', description: '读取一个 Profile，只读。', parameters: { type: 'object', properties: { profileId: { type: 'string' } }, required: ['profileId'], additionalProperties: false }, strict: true },
    { type: 'function', name: 'read_project', description: '读取一个 Project，只读。', parameters: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'], additionalProperties: false }, strict: true }
  ];
}

module.exports = { getToolDefinitions };
