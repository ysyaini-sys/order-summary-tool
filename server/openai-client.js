function responseEndpoint(baseUrl) {
  const normalized = String(baseUrl).replace(/\/+$/, '');
  if (normalized.endsWith('/responses')) return normalized;
  if (normalized.endsWith('/v1')) return `${normalized}/responses`;
  return `${normalized}/v1/responses`;
}

function isLoopbackEndpoint(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase()) &&
      !url.username && !url.password;
  } catch { return false; }
}

function createOpenAIClient(env = process.env, fetchImpl = fetch) {
  const gatewayToken = env.OPENCLAW_GATEWAY_TOKEN;
  const apiKey = gatewayToken || env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const provider = gatewayToken ? 'openclaw' : 'openai';
  const baseUrl = env.OPENAI_BASE_URL || (gatewayToken ? 'http://127.0.0.1:18789/v1' : 'https://api.openai.com/v1');
  if (gatewayToken && !isLoopbackEndpoint(baseUrl)) return null;
  const model = env.OPENAI_MODEL || (provider === 'openclaw' ? 'openclaw/default' : 'gpt-5');
  const endpoint = responseEndpoint(baseUrl);

  return {
    provider,
    async respond({ input, tools = [] }) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input, tools, store: false })
      });
      if (!response.ok) throw new Error(`AI provider request failed: ${response.status}`);
      return response.json();
    }
  };
}

module.exports = { createOpenAIClient, responseEndpoint, isLoopbackEndpoint };
