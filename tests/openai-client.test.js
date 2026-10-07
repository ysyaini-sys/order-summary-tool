const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenAIClient } = require('../server/openai-client.js');

test('uses_openai_responses_by_default', async t => {
  let request;
  const fakeFetch = async (url, options) => {
    request = { url, options };
    return { ok: true, async json() { return { output_text: 'hello' }; } };
  };
  t.mock.method(global, 'fetch', fakeFetch);
  const client = createOpenAIClient({ OPENAI_API_KEY: 'test-openai-key' }, fakeFetch);
  assert.ok(client, 'configured OpenAI provider should produce a client');

  const response = await client.respond({ input: 'say hello' });
  assert.equal(client.provider, 'openai');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.options.headers.authorization, 'Bearer test-openai-key');
  assert.equal(JSON.parse(request.options.body).model, 'gpt-5');
  assert.equal(response.output_text, 'hello');
});

test('uses_configured_openclaw_compatible_endpoint', async () => {
  let request;
  const client = createOpenAIClient({
    OPENAI_BASE_URL: 'http://127.0.0.1:18789/v1',
    OPENAI_MODEL: 'openclaw/default',
    OPENCLAW_GATEWAY_TOKEN: 'test-gateway-token'
  }, async (url, options) => {
    request = { url, options };
    return { ok: true, async json() { return { output_text: 'local result' }; } };
  });

  assert.ok(client, 'configured OpenClaw provider should produce a client');
  await client.respond({ input: 'continue' });
  assert.equal(client.provider, 'openclaw');
  assert.equal(request.url, 'http://127.0.0.1:18789/v1/responses');
  assert.equal(request.options.headers.authorization, 'Bearer test-gateway-token');
  assert.equal(JSON.parse(request.options.body).model, 'openclaw/default');
});

test('openclaw_defaults_to_loopback_and_rejects_nonlocal_token_destinations', async () => {
  let endpoint;
  const defaultClient = createOpenAIClient({ OPENCLAW_GATEWAY_TOKEN: 'local-token' }, async url => {
    endpoint = url;
    return { ok: true, async json() { return {}; } };
  });
  assert.ok(defaultClient);
  assert.equal(defaultClient.provider, 'openclaw');
  await defaultClient.respond({ input: 'test' });
  assert.equal(endpoint, 'http://127.0.0.1:18789/v1/responses');

  const remoteClient = createOpenAIClient({
    OPENCLAW_GATEWAY_TOKEN: 'local-token',
    OPENAI_BASE_URL: 'https://api.openai.com/v1'
  }, async () => {});
  assert.equal(remoteClient, null);
});

test('reports_provider_http_errors_without_body', async t => {
  const fakeFetch = async () => ({
    ok: false,
    status: 401,
    async text() { return 'upstream echoed test-gateway-token'; }
  });
  t.mock.method(global, 'fetch', fakeFetch);
  const client = createOpenAIClient({ OPENCLAW_GATEWAY_TOKEN: 'test-gateway-token' }, async () => ({
    ok: false, status: 401
  }));

  assert.ok(client, 'configured OpenClaw provider should produce a client');
  await assert.rejects(client.respond({ input: 'test' }), error => {
    assert.match(error.message, /401/);
    assert.doesNotMatch(error.message, /test-gateway-token|upstream echoed/);
    return true;
  });
});
