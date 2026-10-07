const path = require('node:path');
const { loadContentSkills } = require('./content-skills.js');

function routeTask(input = '', skills = loadContentSkills(path.resolve(__dirname, '..'))) {
  const text = String(input).toLowerCase();
  if (/千川|投放|消耗|roi/.test(text)) return 'qianchuan-analysis';
  if (/订单|order/.test(text)) return 'order-summary';
  const match = skills.find(skill => skill.keywords.some(keyword => text.includes(keyword.toLowerCase())));
  if (match) return match.id;
  return 'general';
}

module.exports = { routeTask };
