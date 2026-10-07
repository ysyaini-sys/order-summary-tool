function createOpenAIClient(env = process.env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    async respond({ model = env.OPENAI_MODEL || 'gpt-5', input, tools = [] }) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input, tools, store: false })
      });
      if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
      return response.json();
    }
  };
}

module.exports = { createOpenAIClient };
