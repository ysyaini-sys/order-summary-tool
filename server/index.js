const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { buildContext } = require('./context-builder.js');
const { createOpenAIClient } = require('./openai-client.js');
const { createToolRegistry } = require('./tool-registry.js');
const { getToolDefinitions } = require('./tool-definitions.js');
const { buildProductDetailPrompt } = require('./product-detail-agent.js');
const { createProjectStore } = require('./project-store.js');
const { runWithTools } = require('./agent-runtime.js');
const { loadContentSkills } = require('./content-skills.js');
const { createContentProject, advanceContentProject } = require('../workstation/content-workflow.js');

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res, root) {
  const requested = new URL(req.url, 'http://127.0.0.1').pathname;
  const relative = requested === '/' ? 'index.html' : requested.slice(1);
  const allowed = new Set(['index.html', 'toufang.html', 'qianchuan.html', 'sheet.html', 'detail-page.html', 'detail-page.js', 'ai-assistant.html', 'ai-assistant.js', 'content-center.html', 'content-center.js', 'workspace.css', 'qianchuan.js', 'toufang-sheet.js', 'order-ai-summary.js']);
  if (!allowed.has(relative)) return false;
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return false;
  const type = relative.endsWith('.html') ? 'text/html; charset=utf-8' : relative.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
  res.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
  return true;
}

function normalizeContentProject(project) {
  if (project.workflow) return project;
  const workflowProject = createContentProject({
    id: project.id,
    name: project.name || project.id,
    profileId: project.profileId || null
  });
  const continuation = project.continuation || {};
  const legacyCurrent = String(continuation.current || '').toLowerCase();
  const stage = /qa|review|审核/.test(legacyCurrent) ? 'review' : continuation.current ? 'produce' : 'discover';
  const stageOrder = ['discover', 'plan', 'produce', 'review', 'publish', 'learn'];
  const currentIndex = stageOrder.indexOf(stage);
  for (let index = 0; index < currentIndex; index += 1) workflowProject.workflow.stages[stageOrder[index]].status = 'complete';
  workflowProject.workflow.stages[stage].status = 'in_progress';
  workflowProject.workflow.currentStage = stage;
  workflowProject.workflow.nextAction = { stage, label: `继续${stage === 'produce' ? '创作' : stage === 'review' ? '审核' : '发现'}阶段` };
  workflowProject.workflow.continuingFrom = continuation.continuingFrom?.source || continuation.current || null;
  if (continuation.task || continuation.current || continuation.next) {
    workflowProject.workflow.stages[stage].notes = [continuation.task, continuation.current && `当前步骤：${continuation.current}`, continuation.next && `下一步：${continuation.next}`].filter(Boolean).join('；');
  }
  return { ...project, workflow: workflowProject.workflow };
}

function createServer({ env = process.env, root = process.cwd(), client: clientOverride } = {}) {
  const client = clientOverride === undefined ? createOpenAIClient(env) : clientOverride;
  const registry = createToolRegistry({ root });
  const projectStore = createProjectStore({ root });
  return http.createServer((req, res) => {
    if (req.method === 'GET' && serveStatic(req, res, root)) return;
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, {
      ok: true,
      aiConfigured: Boolean(client),
      provider: client?.provider || null
    });
    if (req.method === 'GET' && req.url === '/api/tools') return json(res, 200, { tools: registry.list(), canWrite: registry.canWrite });
    if (req.method === 'GET' && req.url === '/api/content/skills') {
      try { return json(res, 200, { skills: loadContentSkills(root) }); }
      catch { return json(res, 500, { error: 'skill_registry_unavailable' }); }
    }
    if (req.method === 'GET' && req.url === '/api/content/profiles') {
      try { return json(res, 200, { profiles: projectStore.listProfiles() }); }
      catch { return json(res, 500, { error: 'profiles_unavailable' }); }
    }
    if (req.method === 'GET' && req.url === '/api/content/projects') {
      try { return json(res, 200, { projects: projectStore.listProjects() }); }
      catch { return json(res, 500, { error: 'projects_unavailable' }); }
    }
    if (req.method === 'POST' && req.url === '/api/content/profiles') {
      let raw = '';
      req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
      req.on('end', () => {
        try {
          const body = JSON.parse(raw || '{}');
          if (projectStore.listProfiles().some(profile => profile.id === body.id)) return json(res, 409, { error: 'profile_already_exists' });
          const profile = {
            id: body.id,
            name: body.name,
            platforms: body.platforms || [],
            audience: body.audience || [],
            style: body.style || [],
            boundaries: body.boundaries || []
          };
          if (typeof profile.name !== 'string' || profile.name.length > 160 ||
            ['platforms', 'audience', 'style', 'boundaries'].some(field => !Array.isArray(profile[field]) || profile[field].length > 50 || profile[field].some(item => typeof item !== 'string' || item.length > 300))) {
            return json(res, 400, { error: 'invalid_profile' });
          }
          return json(res, 201, projectStore.saveProfile(profile.id, profile));
        } catch (error) {
          return json(res, 400, { error: 'invalid_profile', message: error.message });
        }
      });
      return;
    }
    const contentProjectMatch = req.url.match(/^\/api\/content\/projects\/([^/]+)(?:\/(advance))?$/);
    if (req.method === 'GET' && contentProjectMatch && !contentProjectMatch[2]) {
      try {
        const projectId = decodeURIComponent(contentProjectMatch[1]);
        return json(res, 200, { project: normalizeContentProject(projectStore.readProject(projectId)), outputs: projectStore.listOutputs(projectId) });
      } catch (error) {
        return json(res, error.code === 'ENOENT' ? 404 : 400, { error: 'project_unavailable' });
      }
    }
    if (req.method === 'POST' && (req.url === '/api/content/projects' || contentProjectMatch)) {
      let raw = '';
      req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
      req.on('end', () => {
        try {
          const body = JSON.parse(raw || '{}');
          if (req.url === '/api/content/projects') {
            if (projectStore.listProjects().some(existing => existing.id === body.id)) return json(res, 409, { error: 'project_already_exists' });
            const profile = projectStore.readProfile(body.profileId);
            const project = createContentProject({ id: body.id, name: body.name, profileId: profile.id });
            return json(res, 201, projectStore.createProject(project));
          }
          if (!contentProjectMatch) return json(res, 404, { error: 'not_found' });
          const projectId = decodeURIComponent(contentProjectMatch[1]);
          if (!contentProjectMatch[2]) return json(res, 404, { error: 'not_found' });
          const project = normalizeContentProject(projectStore.readProject(projectId));
          const stage = body.stage;
          const patch = body.patch || {};
          const updated = advanceContentProject(project, stage, {
            ...patch,
            continuingFrom: patch.continuingFrom === undefined ? stage : patch.continuingFrom
          });
          return json(res, 200, projectStore.saveProject(updated));
        } catch (error) {
          const status = error.code === 'ENOENT' ? 404 : 400;
          return json(res, status, { error: 'invalid_content_project', message: error.message });
        }
      });
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/api/context')) {
      try {
        const query = new URL(req.url, 'http://127.0.0.1').searchParams;
        return json(res, 200, {
          profile: registry.call('read_profile', { profileId: query.get('profileId') || 'example' }),
          project: registry.call('read_project', { projectId: query.get('projectId') || 'example' }),
          baseline: registry.call('read_baseline')
        });
      } catch (error) {
        return json(res, 400, { error: 'invalid_context', message: error.message });
      }
    }
    if (req.method !== 'POST' || req.url !== '/api/assistant') return json(res, 404, { error: 'not_found' });
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        if (!client) return json(res, 503, { error: 'ai_not_configured', message: '请在服务端配置 OPENAI_API_KEY，或连接本机 OpenClaw Gateway。' });
        const incomingProject = body.project?.project || body.project || {};
        let savedProject = {};
        if (body.projectId) {
          try { savedProject = registry.call('read_project', { projectId: body.projectId }); }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        const savedContinuation = savedProject.continuation || {};
        const project = { ...savedProject, ...savedContinuation, ...incomingProject };
        const profile = body.profile || body.project?.profile || (body.profileId ? registry.call('read_profile', { profileId: body.profileId }) : {});
        const context = buildContext({ ...body, project, profile });
        if (context.skill === 'product-detail') {
          const product = project.product || {};
          const missingRequired = [];
          if (!product.name) missingRequired.push('product.name');
          if (!product.heroAsset) missingRequired.push('product.heroAsset');
          if (!product.specification) missingRequired.push('product.specification');
          if (!Array.isArray(project.platforms) || !project.platforms.length) missingRequired.push('platforms');
          if (missingRequired.length) return json(res, 422, { error: 'blocked_identity', missingRequired });
        }
        const input = context.skill === 'product-detail'
          ? buildProductDetailPrompt({ ...body, profile: context.profile, project: context.project })
          : `${context.instructions}\n\n最近对话：${JSON.stringify((body.history || []).slice(-12))}\n\n用户任务：${body.task || ''}\n项目上下文：${JSON.stringify(context.project)}`;
        const result = await runWithTools(client, { input, tools: getToolDefinitions() }, registry);
        let archive = null;
        if (body.projectId) {
          try {
            archive = projectStore.saveAIResult(body.projectId, {
              skill: context.skill,
              output: result.output_text || result,
              project: { id: body.projectId, name: incomingProject.product?.name || savedProject.name || body.projectId, profileId: body.profileId || profile.id || savedProject.profileId || null },
              continuation: incomingProject || savedContinuation
            });
          } catch (error) { return json(res, 400, { error: 'project_archive_failed', message: error.message }); }
        }
        return json(res, 200, { skill: context.skill, response: result, archive });
      } catch (error) {
        return json(res, 400, { error: 'bad_request', message: error.message });
      }
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createServer().listen(port, '127.0.0.1', () => console.log(`AI workstation service listening on http://127.0.0.1:${port}`));
}

module.exports = { createServer };
