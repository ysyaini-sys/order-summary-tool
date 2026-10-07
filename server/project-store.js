const fs = require('node:fs');
const path = require('node:path');

function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
}

function createProjectStore({ root }) {
  function projectDir(projectId) {
    if (!validId(projectId)) throw new Error('invalid project id');
    const dir = path.join(root, 'projects', projectId);
    if (!fs.existsSync(path.join(dir, 'project.json'))) throw new Error('project not found');
    return dir;
  }

  return {
    saveAIResult(projectId, result) {
      if (!validId(projectId)) throw new Error('invalid project id');
      const dir = path.join(root, 'projects', projectId);
      fs.mkdirSync(dir, { recursive: true });
      const projectFile = path.join(dir, 'project.json');
      if (!fs.existsSync(projectFile)) {
        fs.writeFileSync(projectFile, JSON.stringify(result.project || { id: projectId, name: projectId, status: 'active' }, null, 2));
      }
      const outputDir = path.join(dir, 'ai-results');
      fs.mkdirSync(outputDir, { recursive: true });
      const versions = fs.readdirSync(outputDir).filter(file => /^v\d+\.json$/.test(file));
      const version = versions.reduce((max, file) => Math.max(max, Number(file.slice(1, -5))), 0) + 1;
      const record = { version, createdAt: new Date().toISOString(), ...result };
      fs.writeFileSync(path.join(outputDir, `v${version}.json`), JSON.stringify(record, null, 2));
      const continuationFile = path.join(dir, 'continuation.json');
      const continuation = fs.existsSync(continuationFile) ? JSON.parse(fs.readFileSync(continuationFile, 'utf8')) : {};
      if (result.continuation) Object.assign(continuation, result.continuation);
      continuation.lastAISkill = result.skill || null;
      continuation.lastAIResultVersion = version;
      fs.writeFileSync(continuationFile, JSON.stringify(continuation, null, 2));
      return record;
    }
  };
}

module.exports = { createProjectStore };
