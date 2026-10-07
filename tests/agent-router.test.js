const test = require('node:test');
const assert = require('node:assert/strict');
const { routeTask } = require('../server/agent-router.js');
const { loadContentSkills } = require('../server/content-skills.js');

const skills = loadContentSkills(require('node:path').join(__dirname, '..'));

test('routes_ecommerce_tasks_to_registered_skills', () => {
  assert.equal(routeTask('帮我找一下这个品类的选品机会', skills), 'product-discovery');
  assert.equal(routeTask('写一个抖音短视频脚本', skills), 'short-video-script');
  assert.equal(routeTask('审核这批广告素材', skills), 'creative-review');
  assert.equal(routeTask('商品详情页首屏文案', skills), 'product-detail');
  assert.equal(routeTask('总结本周内容复盘', skills), 'content-retrospective');
});

test('existing_data_skills_keep_their_safe_routes', () => {
  assert.equal(routeTask('分析昨天千川商品消耗', skills), 'qianchuan-analysis');
  assert.equal(routeTask('汇总订单', skills), 'order-summary');
});

test('unknown_tasks_remain_general', () => {
  assert.equal(routeTask('随便聊聊', skills), 'general');
});
