const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProductDetailPrompt } = require('../server/product-detail-agent.js');

test('builds a product-detail agent prompt with structured deliverables and safety rules', () => {
  const prompt = buildProductDetailPrompt({
    task: '继续上次详情页',
    project: { continuation: { current: 'storyboard', next: '首屏 QA' } },
    profile: { name: '示例品牌' }
  });
  assert.match(prompt, /Product Brief/);
  assert.match(prompt, /页面蓝图/);
  assert.match(prompt, /QA/);
  assert.match(prompt, /未核验/);
  assert.match(prompt, /首屏 QA/);
});
