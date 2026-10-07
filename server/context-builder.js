const { routeTask } = require('./agent-router.js');

function buildContext({ task = '', profile = null, project = null } = {}) {
  const skill = routeTask(task);
  return {
    skill,
    task,
    profile: profile || {},
    project: project || {},
    instructions: [
      '只使用当前提供的 Profile、Project 和 checkpoint 上下文。',
      '商品身份资料不完整时先指出缺失项，不进入正式设计。',
      '不得把未核验卖点写成已证实事实。',
      '不得直接修改订单、投放或千川原始数据。',
      '涉及发布、通知、投放修改或删除时必须请求人工确认。'
    ].join('\n')
  };
}

module.exports = { buildContext };
