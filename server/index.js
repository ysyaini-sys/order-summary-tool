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

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res, root) {
  const requested = new URL(req.url, 'http://127.0.0.1').pathname;
  const relative = requested === '/' ? 'index.html' : requested.slice(1);
  const allowed = new Set(['index.html', 'toufang.html', 'qianchuan.html', 'sheet.html', 'detail-page.html', 'detail-page.js', 'ai-assistant.html', 'ai-assistant.js', 'workspace.css', 'qianchuan.js', 'toufang-sheet.js', 'order-ai-summary.js']);
  if (!allowed.has(relative)) return false;
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return false;
  const type = relative.endsWith('.html') ? 'text/html; charset=utf-8' : relative.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
  res.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
  return true;
}

function createServer({ env = process.env, root = process.cwd(), client: clientOverride } = {}) {
  const client = clientOverride === undefined ? createOpenAIClient(env) : clientOverride;
  const registry = createToolRegistry({ root });
  const projectStore = createProjectStore({ root });
  return http.createServer((req, res) => {
    if (req.method === 'GET' && serveStatic(req, res, root)) return;
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, aiConfigured: Boolean(client) });
    if (req.method === 'GET' && req.url === '/api/tools') return json(res, 200, { tools: registry.list(), canWrite: registry.canWrite });
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
        if (!client) return json(res, 503, { error: 'ai_not_configured', message: '请在服务端配置 OPENAI_API_KEY。' });
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
