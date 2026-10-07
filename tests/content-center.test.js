const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createServer } = require('../server/index.js');

const sourceRoot = path.join(__dirname, '..');

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-center-'));
  for (const name of ['workstation', 'profiles', 'projects']) fs.cpSync(path.join(sourceRoot, name), path.join(root, name), { recursive: true });
  for (const file of ['content-center.html', 'content-center.js', 'workspace.css']) {
    const source = path.join(sourceRoot, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(root, file));
  }
  return root;
}

async function withServer(t, root) {
  const server = createServer({ env: {}, root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('content_center_renders_all_stages_and_skills', () => {
  const page = fs.readFileSync(path.join(sourceRoot, 'content-center.html'), 'utf8');
  const script = fs.readFileSync(path.join(sourceRoot, 'content-center.js'), 'utf8');
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(page, /内容中心/);
  assert.match(page, /id="profile-select"/);
  assert.match(page, /id="create-profile-form"/);
  assert.match(page, /id="project-select"/);
  assert.match(page, /id="workflow-stages"/);
  assert.match(page, /id="skill-list"/);
  assert.match(script, /discover/);
  assert.match(script, /aiConfigured/);
});

test('content_center_works_without_ai_and_serves_registered_skills', async t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = await withServer(t, root);
  const [health, page, skills, profiles, projects] = await Promise.all([
    fetch(`${base}/health`).then(response => response.json()),
    fetch(`${base}/content-center.html`),
    fetch(`${base}/api/content/skills`).then(response => response.json()),
    fetch(`${base}/api/content/profiles`).then(response => response.json()),
    fetch(`${base}/api/content/projects`).then(response => response.json())
  ]);
  assert.equal(health.aiConfigured, false);
  assert.equal(page.status, 200);
  assert.ok(skills.skills.some(skill => skill.id === 'short-video-script'));
  assert.ok(profiles.profiles.some(profile => profile.id === 'example-profile'));
  assert.ok(projects.projects.some(project => project.id === 'example-project'));
  const existing = await fetch(`${base}/api/content/projects/example-project`).then(response => response.json());
  assert.equal(existing.project.workflow.currentStage, 'produce');
  assert.match(existing.project.workflow.stages.produce.notes, /首屏蓝图/);
});

test('project_checkpoint_can_be_resumed_and_advanced_through_validated_endpoint', async t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = await withServer(t, root);
  const created = await fetch(`${base}/api/content/projects`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'test-project', name: '测试内容项目', profileId: 'example-profile' })
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).workflow.currentStage, 'discover');

  const advance = await fetch(`${base}/api/content/projects/test-project/advance`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage: 'discover', patch: { status: 'complete', notes: '核对过的需求' } })
  });
  const body = await advance.json();
  assert.equal(advance.status, 200);
  assert.equal(body.workflow.currentStage, 'plan');

  const resumed = await fetch(`${base}/api/content/projects/test-project`).then(response => response.json());
  assert.equal(resumed.project.workflow.currentStage, 'plan');
  assert.equal(resumed.project.workflow.continuingFrom, 'discover');
});

test('profiles_can_be_created_with_structured_local_brand_context', async t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = await withServer(t, root);
  const response = await fetch(`${base}/api/content/profiles`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'brand-profile', name: '自有品牌', platforms: ['抖音'], audience: ['家庭用户'], style: ['清晰'], boundaries: ['不夸大功效'] })
  });
  const profile = await response.json();
  assert.equal(response.status, 201);
  assert.equal(profile.audience[0], '家庭用户');
  assert.ok(fs.existsSync(path.join(root, 'profiles', 'brand-profile', 'profile.json')));
});

test('invalid project ids cannot create or mutate workspace data', async t => {
  const root = fixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = await withServer(t, root);
  const response = await fetch(`${base}/api/content/projects/..%2Fescape/advance`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage: 'discover', patch: { status: 'complete' } })
  });
  assert.equal(response.status, 400);
});

test('legacy_workspaces_link_to_content_center', () => {
  for (const file of ['index.html', 'toufang.html', 'qianchuan.html', 'detail-page.html', 'ai-assistant.html']) {
    const page = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
    assert.match(page, /content-center\.html/);
  }
});

test('local_server_smoke_checks_all_existing_and_new_workspace_pages', async t => {
  const base = await withServer(t, sourceRoot);
  for (const page of ['/', '/toufang.html', '/qianchuan.html', '/detail-page.html', '/ai-assistant.html', '/content-center.html']) {
    const response = await fetch(`${base}${page}`);
    assert.equal(response.status, 200, `${page} should be served`);
  }
});
