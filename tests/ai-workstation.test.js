const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContext } = require('../server/context-builder.js');
const { routeTask } = require('../server/agent-router.js');
const { createOpenAIClient } = require('../server/openai-client.js');
const { createServer } = require('../server/index.js');
const fs = require('node:fs');
const os = require('node:os');

test('builds a bounded product-detail context from project checkpoint', () => {
  const context = buildContext({
    task: '继续商品详情页',
    profile: { id: 'brand-a', name: '品牌 A' },
    project: { id: 'rice-2026', continuation: { current: 'storyboard', next: '首屏 QA' } }
  });
  assert.equal(context.skill, 'product-detail');
  assert.equal(context.project.id, 'rice-2026');
  assert.equal(context.project.continuation.next, '首屏 QA');
  assert.equal(context.skillDefinition.id, 'product-detail');
  assert.match(context.instructions, /证据规则/);
  assert.ok(context.instructions.includes('不得把未核验卖点写成已证实事实'));
});

test('routes known workstation tasks without touching legacy calculators', () => {
  assert.equal(routeTask('帮我继续上次商品详情页'), 'product-detail');
  assert.equal(routeTask('分析昨天千川商品消耗'), 'qianchuan-analysis');
  assert.equal(routeTask('汇总订单'), 'order-summary');
  assert.equal(routeTask('随便聊聊'), 'general');
});

test('does not create an API client when the key is absent', () => {
  assert.equal(createOpenAIClient({}), null);
});

test('reports safe AI-not-configured status without fabricating a response', async () => {
  const server = createServer({ env: {}, root: require('node:path').join(__dirname, '..') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/assistant`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: '继续商品详情页' })
  });
  const body = await response.json();
  server.close();
  assert.equal(response.status, 503);
  assert.equal(body.error, 'ai_not_configured');
});

test('does_not_expose_provider_secrets_in_health', async () => {
  const server = createServer({
    env: { OPENAI_BASE_URL: 'http://127.0.0.1:18789/v1', OPENCLAW_GATEWAY_TOKEN: 'test-gateway-token' },
    root: require('node:path').join(__dirname, '..')
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  const body = await response.json();
  await new Promise(resolve => server.close(resolve));

  assert.equal(body.aiConfigured, true);
  assert.equal(body.provider, 'openclaw');
  assert.equal(JSON.stringify(body).includes('test-gateway-token'), false);
  assert.equal(JSON.stringify(body).includes('127.0.0.1'), false);
});

test('exposes bounded project context endpoint', async () => {
  const server = createServer({ env: {}, root: require('node:path').join(__dirname, '..') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/context?projectId=example&profileId=example`);
  const body = await response.json();
  server.close();
  assert.equal(response.status, 200);
  assert.equal(body.project.id, 'example-project');
  assert.equal(body.profile.id, 'example-profile');
});

test('serves the local assistant pages and scripts from the AI service', async () => {
  const server = createServer({ env: {}, root: require('node:path').join(__dirname, '..') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const page = await fetch(`http://127.0.0.1:${address.port}/detail-page.html`);
  const script = await fetch(`http://127.0.0.1:${address.port}/detail-page.js`);
  const orderScript = await fetch(`http://127.0.0.1:${address.port}/order-ai-summary.js`);
  server.close();
  assert.equal(page.status, 200);
  assert.match(await page.text(), /商品详情页项目工作台/);
  assert.equal(script.status, 200);
  assert.match(await script.text(), /buildCheckpoint/);
  assert.equal(orderScript.status, 200);
  assert.match(await orderScript.text(), /buildOrderAiSummary/);
});

test('assistant combines checkpoint context, returns AI output and archives a project version', async () => {
  const root = fs.mkdtempSync(require('node:path').join(os.tmpdir(), 'assistant-e2e-'));
  const received = [];
  const client = { async respond(request) { received.push(request); return { output_text: 'Product Brief 与页面蓝图建议' , output: [{ type: 'message' }] }; } };
  const server = createServer({ env: {}, root, client });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/assistant`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      task: '继续商品详情页', projectId: 'rice-project',
      project: { project: { id: 'rice-project', task: '商品详情页', product: { name: '五常大米', heroAsset: 'hero.png', specification: '5kg' }, platforms: ['douyin'], next: '首屏 QA' }, profile: { id: 'brand-a' } }
    })
  });
  const body = await response.json();
  await new Promise(resolve => server.close(resolve));
  assert.equal(response.status, 200);
  assert.equal(body.response.output_text, 'Product Brief 与页面蓝图建议');
  assert.equal(body.archive.version, 1);
  assert.ok(JSON.stringify(received[0].input).includes('五常大米'));
  const saved = JSON.parse(fs.readFileSync(require('node:path').join(root, 'projects', 'rice-project', 'continuation.json'), 'utf8'));
  assert.equal(saved.next, '首屏 QA');
});

test('server identity gate blocks incomplete product details before calling the model', async () => {
  const root = fs.mkdtempSync(require('node:path').join(os.tmpdir(), 'assistant-gate-'));
  let modelCalls = 0;
  const client = { async respond() { modelCalls += 1; return { output_text: 'should not run' }; } };
  const server = createServer({ env: {}, root, client });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/assistant`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ task: '生成商品详情页', project: { product: { name: '大米' }, platforms: [] } })
  });
  const body = await response.json();
  await new Promise(resolve => server.close(resolve));
  assert.equal(response.status, 422);
  assert.equal(body.error, 'blocked_identity');
  assert.deepEqual(body.missingRequired, ['product.heroAsset', 'product.specification', 'platforms']);
  assert.equal(modelCalls, 0);
});
