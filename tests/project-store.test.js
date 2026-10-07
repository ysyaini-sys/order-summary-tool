const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createProjectStore } = require('../server/project-store.js');

test('archives AI result versions and updates continuation metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-project-'));
  fs.mkdirSync(path.join(root, 'projects', 'demo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'projects', 'demo', 'project.json'), JSON.stringify({ id: 'demo' }));
  fs.writeFileSync(path.join(root, 'projects', 'demo', 'continuation.json'), JSON.stringify({ current: 'storyboard' }));
  const store = createProjectStore({ root });
  const saved = store.saveAIResult('demo', { skill: 'product-detail', output: 'QA 建议' });
  assert.equal(saved.version, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'demo', 'continuation.json'))).lastAISkill, 'product-detail');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'demo', 'ai-results', 'v1.json'))).output, 'QA 建议');
});

test('creates a new project from its checkpoint when archiving the first AI result', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-new-project-'));
  const store = createProjectStore({ root });
  const saved = store.saveAIResult('rice-2026', {
    skill: 'product-detail', output: 'Brief',
    project: { id: 'rice-2026', name: '五常大米' },
    continuation: { task: '商品详情页', next: '制作首屏' }
  });
  assert.equal(saved.version, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'rice-2026', 'project.json'))).id, 'rice-2026');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'projects', 'rice-2026', 'continuation.json'))).next, '制作首屏');
});

test('lists_private_projects', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-project-list-'));
  const store = createProjectStore({ root });
  store.createProject({ id: 'launch', name: '新品上新', profileId: 'shop' });

  assert.deepEqual(store.listProjects().map(project => project.id), ['launch']);
  assert.equal(store.readProject('launch').name, '新品上新');
});

test('reads_example_records_by_declared_id_when_folder_name_differs', () => {
  const root = path.join(__dirname, '..');
  const store = createProjectStore({ root });
  assert.equal(store.readProfile('example-profile').name, '示例账号');
  assert.equal(store.readProject('example-project').name, '示例项目');
});

test('persists_workflow_checkpoint', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-workflow-save-'));
  const store = createProjectStore({ root });
  const project = store.createProject({ id: 'launch', name: '新品上新', profileId: 'shop' });
  project.workflow = { currentStage: 'plan', nextAction: { stage: 'plan', label: '继续策划阶段' }, continuingFrom: 'chat-7', stages: {} };

  store.saveProject(project);
  assert.deepEqual(store.readProject('launch').workflow, project.workflow);
});

test('increments_output_versions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-output-version-'));
  const store = createProjectStore({ root });
  store.createProject({ id: 'launch', name: '新品上新', profileId: 'shop' });

  assert.equal(store.saveAIResult('launch', { skill: 'video-script', output: '脚本初稿' }).version, 1);
  assert.equal(store.saveAIResult('launch', { skill: 'video-script', output: '脚本修订' }).version, 2);
  assert.equal(store.listOutputs('launch').length, 2);
});

test('creates_and_saves_profile_without_secrets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-profile-save-'));
  const store = createProjectStore({ root });
  const profile = { id: 'shop', name: '自有品牌', audience: ['家庭用户'], style: ['清楚克制'] };

  store.saveProfile('shop', profile);
  assert.deepEqual(store.readProfile('shop'), profile);
  assert.throws(() => store.saveProfile('shop', { ...profile, apiKey: 'never-store-me' }), /secret fields are not allowed/i);
});

test('rejects_invalid_project_ids', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-invalid-id-'));
  const store = createProjectStore({ root });

  assert.throws(() => store.createProject({ id: '../escape', name: 'bad', profileId: 'shop' }), /invalid project id/i);
  assert.throws(() => store.readProfile('../secret'), /invalid profile id/i);
});

test('missing_project_has_enoent_code_for_legacy_first_result_archive', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-missing-project-'));
  const store = createProjectStore({ root });

  assert.throws(() => store.readProject('not-created'), error => error.code === 'ENOENT');
});

test('rejects_path_traversal', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-symlink-root-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-symlink-outside-'));
  fs.mkdirSync(path.join(root, 'projects'), { recursive: true });
  fs.symlinkSync(outside, path.join(root, 'projects', 'escape'));
  const store = createProjectStore({ root });

  assert.throws(() => store.createProject({ id: 'escape', name: 'bad', profileId: 'shop' }), /unsafe project path/i);
  assert.equal(fs.existsSync(path.join(outside, 'escape', 'project.json')), false);
});

test('rejects_symlinked_project_continuation_and_output_json_files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-file-symlink-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'workstation-file-outside-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  const store = createProjectStore({ root });
  store.createProject({ id: 'demo', name: 'demo', profileId: null });
  const dir = path.join(root, 'projects', 'demo');
  const outsideJson = path.join(outside, 'data.json');
  fs.writeFileSync(outsideJson, JSON.stringify({ private: 'outside' }));

  fs.symlinkSync(outsideJson, path.join(dir, 'continuation.json'));
  assert.throws(() => store.readProject('demo'), /unsafe/i);
  fs.unlinkSync(path.join(dir, 'continuation.json'));

  fs.mkdirSync(path.join(dir, 'ai-results'));
  fs.symlinkSync(outsideJson, path.join(dir, 'ai-results', 'v1.json'));
  assert.throws(() => store.listOutputs('demo'), /unsafe/i);

  fs.unlinkSync(path.join(dir, 'project.json'));
  fs.symlinkSync(outsideJson, path.join(dir, 'project.json'));
  assert.throws(() => store.readProject('demo'), /unsafe/i);
});

test('gitignores private runtime data but keeps examples trackable', () => {
  const root = path.join(__dirname, '..');
  const ignoredProject = spawnSync('git', ['check-ignore', '--no-index', '-q', 'projects/private/project.json'], { cwd: root });
  const ignoredProfile = spawnSync('git', ['check-ignore', '--no-index', '-q', 'profiles/private/profile.json'], { cwd: root });
  const ignoredExample = spawnSync('git', ['check-ignore', '--no-index', '-q', 'projects/example/project.json'], { cwd: root });

  assert.equal(ignoredProject.status, 0);
  assert.equal(ignoredProfile.status, 0);
  assert.equal(ignoredExample.status, 1);
});
