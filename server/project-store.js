const fs = require('node:fs');
const path = require('node:path');

const PRIVATE_FIELD = /^(?:api.?key|access.?token|refresh.?token|gateway.?token|cookie|password|secret|credential|authorization)$/i;

function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function assertNoSecrets(value, field = '') {
  if (PRIVATE_FIELD.test(field)) throw new Error('secret fields are not allowed in Profile or Project data');
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) assertNoSecrets(child, key);
}

function isWithin(parent, child) {
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function missing(kind) {
  const error = new Error(`${kind} not found`);
  error.code = 'ENOENT';
  return error;
}

function createProjectStore({ root }) {
  const rootPath = path.resolve(root);

  function dataDir(kind, id, { create = false } = {}) {
    if (!['projects', 'profiles'].includes(kind)) throw new Error('invalid data kind');
    if (!validId(id)) throw new Error(`invalid ${kind === 'projects' ? 'project' : 'profile'} id`);
    fs.mkdirSync(rootPath, { recursive: true });
    const rootReal = fs.realpathSync(rootPath);
    const collection = path.join(rootReal, kind);
    if (fs.existsSync(collection) && fs.lstatSync(collection).isSymbolicLink()) throw new Error(`unsafe ${kind} path`);
    if (create) fs.mkdirSync(collection, { recursive: true });
    if (!fs.existsSync(collection)) throw missing(kind.slice(0, -1));
    const collectionReal = fs.realpathSync(collection);
    if (!isWithin(rootReal, collectionReal)) throw new Error(`unsafe ${kind} path`);
    const dir = path.join(collectionReal, id);
    if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error(`unsafe ${kind.slice(0, -1)} path`);
    if (!fs.existsSync(dir) && !create) {
      const metadataFile = kind === 'projects' ? 'project.json' : 'profile.json';
      const match = fs.readdirSync(collectionReal, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !fs.lstatSync(path.join(collectionReal, entry.name)).isSymbolicLink())
        .find(entry => {
          const candidate = path.join(collectionReal, entry.name);
          const file = path.join(candidate, metadataFile);
          try {
            const realCandidate = fs.realpathSync(candidate);
            return isWithin(collectionReal, realCandidate) && JSON.parse(fs.readFileSync(file, 'utf8')).id === id;
          } catch { return false; }
        });
      if (match) return fs.realpathSync(path.join(collectionReal, match.name));
    }
    if (create) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(dir)) throw missing(kind.slice(0, -1));
    const realDir = fs.realpathSync(dir);
    if (!isWithin(collectionReal, realDir)) throw new Error(`unsafe ${kind.slice(0, -1)} path`);
    return realDir;
  }

  function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function writeJson(file, value) {
    assertNoSecrets(value);
    const serialized = JSON.stringify(value, null, 2);
    if (Buffer.byteLength(serialized, 'utf8') > 1_000_000) throw new Error('data exceeds size limit');
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, serialized, { flag: 'wx' });
    fs.renameSync(temp, file);
  }

  function readProject(projectId) {
    const dir = dataDir('projects', projectId);
    const project = readJson(path.join(dir, 'project.json'));
    const continuationFile = path.join(dir, 'continuation.json');
    const continuation = fs.existsSync(continuationFile) ? readJson(continuationFile) : null;
    return continuation ? { ...project, continuation } : project;
  }

  function createProject(project) {
    if (!project || !validId(project.id)) throw new Error('invalid project id');
    if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 160) throw new Error('invalid project name');
    if (project.profileId !== null && project.profileId !== undefined && !validId(project.profileId)) throw new Error('invalid profile id');
    if (listProjects().some(existing => existing.id === project.id)) throw new Error('project already exists');
    const dir = dataDir('projects', project.id, { create: true });
    const file = path.join(dir, 'project.json');
    if (fs.existsSync(file)) throw new Error('project already exists');
    const record = {
      id: project.id,
      name: project.name.trim(),
      profileId: project.profileId || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      outputs: [],
      ...(project.workflow ? { workflow: project.workflow } : {})
    };
    writeJson(file, record);
    return record;
  }

  function saveProject(project) {
    if (!project || !validId(project.id)) throw new Error('invalid project id');
    const dir = dataDir('projects', project.id);
    writeJson(path.join(dir, 'project.json'), project);
    return project;
  }

  function listProjects() {
    const collection = path.join(rootPath, 'projects');
    if (!fs.existsSync(collection)) return [];
    if (fs.lstatSync(collection).isSymbolicLink()) throw new Error('unsafe projects path');
    return fs.readdirSync(collection, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && validId(entry.name) && !fs.lstatSync(path.join(collection, entry.name)).isSymbolicLink())
      .filter(entry => fs.existsSync(path.join(collection, entry.name, 'project.json')))
      .map(entry => readProject(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }

  function readProfile(profileId) {
    return readJson(path.join(dataDir('profiles', profileId), 'profile.json'));
  }

  function saveProfile(profileId, profile) {
    if (!validId(profileId)) throw new Error('invalid profile id');
    if (!profile || profile.id !== profileId || typeof profile.name !== 'string' || !profile.name.trim()) throw new Error('invalid profile');
    const dir = dataDir('profiles', profileId, { create: true });
    writeJson(path.join(dir, 'profile.json'), profile);
    return profile;
  }

  function listProfiles() {
    const collection = path.join(rootPath, 'profiles');
    if (!fs.existsSync(collection)) return [];
    if (fs.lstatSync(collection).isSymbolicLink()) throw new Error('unsafe profiles path');
    return fs.readdirSync(collection, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && validId(entry.name) && !fs.lstatSync(path.join(collection, entry.name)).isSymbolicLink())
      .filter(entry => fs.existsSync(path.join(collection, entry.name, 'profile.json')))
      .map(entry => readProfile(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }

  function listOutputs(projectId) {
    const outputDir = path.join(dataDir('projects', projectId), 'ai-results');
    if (!fs.existsSync(outputDir)) return [];
    if (fs.lstatSync(outputDir).isSymbolicLink()) throw new Error('unsafe output path');
    return fs.readdirSync(outputDir)
      .filter(file => /^v\d+\.json$/.test(file))
      .sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)))
      .map(file => readJson(path.join(outputDir, file)));
  }

  function saveAIResult(projectId, result) {
    if (!validId(projectId)) throw new Error('invalid project id');
    if (!result || typeof result !== 'object') throw new Error('invalid AI result');
    let dir;
    try { dir = dataDir('projects', projectId); }
    catch (error) {
      if (error.message !== 'project not found') throw error;
      createProject(result.project || { id: projectId, name: projectId, profileId: null });
      dir = dataDir('projects', projectId);
    }
    const outputDir = path.join(dir, 'ai-results');
    fs.mkdirSync(outputDir, { recursive: true });
    if (fs.lstatSync(outputDir).isSymbolicLink()) throw new Error('unsafe output path');
    const versions = fs.readdirSync(outputDir).filter(file => /^v\d+\.json$/.test(file));
    const version = versions.reduce((max, file) => Math.max(max, Number(file.slice(1, -5))), 0) + 1;
    const record = { version, createdAt: new Date().toISOString(), ...result };
    writeJson(path.join(outputDir, `v${version}.json`), record);
    const continuationFile = path.join(dir, 'continuation.json');
    const continuation = fs.existsSync(continuationFile) ? readJson(continuationFile) : {};
    if (result.continuation) Object.assign(continuation, result.continuation);
    continuation.lastAISkill = result.skill || null;
    continuation.lastAIResultVersion = version;
    writeJson(continuationFile, continuation);
    return record;
  }

  return { createProject, readProject, listProjects, saveProject, readProfile, listProfiles, saveProfile, listOutputs, saveAIResult };
}

module.exports = { createProjectStore };
