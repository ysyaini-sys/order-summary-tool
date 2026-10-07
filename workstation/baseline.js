const fs = require('node:fs');
const path = require('node:path');

function loadBaseline() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
}

function evaluateBaseline(root, options = {}) {
  const baseline = options.baseline || loadBaseline();
  return baseline.checks.map(check => {
    if (check.type === 'manual-required' || check.type === 'not-applicable-to-repo') {
      return { id: check.id, status: check.type, message: check.message };
    }
    const paths = check.paths || [check.path];
    const missing = paths.filter(relative => !fs.existsSync(path.join(root, relative)));
    return missing.length
      ? { id: check.id, status: 'fail', message: `缺少文件：${missing.join('、')}` }
      : { id: check.id, status: 'pass', message: '仓库契约存在。' };
  });
}

module.exports = { loadBaseline, evaluateBaseline };
