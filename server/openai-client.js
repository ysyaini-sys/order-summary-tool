function responseEndpoint(baseUrl) {
  const normalized = String(baseUrl).replace(/\/+$/, '');
  if (normalized.endsWith('/responses')) return normalized;
  if (normalized.endsWith('/v1')) return `${normalized}/responses`;
  return `${normalized}/v1/responses`;
}

function createOpenAIClient(env = process.env, fetchImpl = fetch) {
  const gatewayToken = env.OPENCLAW_GATEWAY_TOKEN;
  const apiKey = gatewayToken || env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const provider = gatewayToken ? 'openclaw' : 'openai';
  const baseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
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

module.exports = { createOpenAIClient, responseEndpoint };
