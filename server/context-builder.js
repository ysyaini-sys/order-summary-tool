const { routeTask } = require('./agent-router.js');
const { loadContentSkills } = require('./content-skills.js');
const path = require('node:path');

function buildContext({ task = '', profile = null, project = null } = {}) {
  const skill = routeTask(task);
  const skillDefinition = loadContentSkills(path.resolve(__dirname, '..')).find(item => item.id === skill) || null;
  return {
    skill,
    skillDefinition,
    task,
    profile: profile || {},
    project: project || {},
    instructions: [
      '只使用当前提供的 Profile、Project 和 checkpoint 上下文。',
      '商品身份资料不完整时先指出缺失项，不进入正式设计。',
      '不得把未核验卖点写成已证实事实。',
      '不得直接修改订单、投放或千川原始数据。',
      '涉及发布、通知、投放修改或删除时必须请求人工确认。',
      ...(skillDefinition ? [`当前 Skill：${skillDefinition.name}（${skillDefinition.stage}）`, `交付内容：${skillDefinition.deliverable}`, `证据规则：${skillDefinition.evidenceRule}`] : [])
    ].join('\n')
  };
}

module.exports = { buildContext };
