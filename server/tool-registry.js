const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safeId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
}

function createToolRegistry({ root }) {
  const tools = {
    read_baseline: () => readJson(path.join(root, 'workstation', 'baseline.json')),
    read_profile: ({ profileId = 'example' } = {}) => {
      if (!safeId(profileId)) throw new Error('invalid profile id');
      return readJson(path.join(root, 'profiles', profileId, 'profile.json'));
    },
    read_project: ({ projectId = 'example' } = {}) => {
      if (!safeId(projectId)) throw new Error('invalid project id');
      const projectRoot = path.join(root, 'projects', projectId);
      const project = readJson(path.join(projectRoot, 'project.json'));
      const continuationFile = path.join(projectRoot, 'continuation.json');
      return fs.existsSync(continuationFile) ? { ...project, continuation: readJson(continuationFile) } : project;
    }
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
