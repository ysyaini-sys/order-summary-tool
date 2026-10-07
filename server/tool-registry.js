const fs = require('node:fs');
const path = require('node:path');
const { createProjectStore } = require('./project-store.js');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function createToolRegistry({ root }) {
  const store = createProjectStore({ root });
  const tools = {
    read_baseline: () => readJson(path.join(root, 'workstation', 'baseline.json')),
    read_profile: ({ profileId = 'example' } = {}) => store.readProfile(profileId),
    read_project: ({ projectId = 'example' } = {}) => store.readProject(projectId)
  };
  return {
    canWrite: false,
    list: () => Object.keys(tools),
    call(name, args) {
      if (!tools[name]) throw new Error(`unknown tool: ${name}`);
      return tools[name](args);
    }
  };
}

module.exports = { createToolRegistry };
