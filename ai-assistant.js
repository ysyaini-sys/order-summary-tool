(function () {
  const task = document.getElementById('assistant-task');
  const context = document.getElementById('project-context');
  const status = document.getElementById('assistant-status');
  const response = document.getElementById('assistant-response');
  const historyKey = () => `workstation-ai-history:${document.getElementById('project-id').value || 'example'}`;
  const readHistory = () => {
    try { return JSON.parse(localStorage.getItem(historyKey()) || '[]'); } catch (_) { return []; }
  };
  const renderHistory = () => {
    const container = document.getElementById('conversation-history');
    container.textContent = '';
    readHistory().forEach(item => {
      const row = document.createElement('p');
      row.textContent = `${item.role === 'user' ? '你' : 'AI'}：${item.content}`;
      container.appendChild(row);
    });
  };
  renderHistory();
  document.getElementById('clear-history').addEventListener('click', () => {
    localStorage.removeItem(historyKey());
    renderHistory();
    response.textContent = '';
    status.textContent = '对话已清空';
  });

  document.getElementById('load-context').addEventListener('click', async () => {
    status.textContent = '读取上下文…';
    try {
      const projectId = encodeURIComponent(document.getElementById('project-id').value || 'example');
      const profileId = encodeURIComponent(document.getElementById('profile-id').value || 'example');
      const result = await fetch(`/api/context?projectId=${projectId}&profileId=${profileId}`);
      const body = await result.json();
      if (!result.ok) throw new Error(body.message || '上下文读取失败');
      context.value = JSON.stringify(body, null, 2);
      status.textContent = '上下文已加载';
    } catch (error) { status.textContent = error.message; }
  });

  const quickTasks = {
    'quick-product-brief': '根据当前商品项目生成 Product Brief，并指出缺失的商品身份资料。',
    'quick-blueprint': '根据当前商品项目生成商品详情页页面蓝图。',
    'quick-qa': '检查当前商品详情页项目的卖点证据、页面蓝图和下一步 QA。'
  };
  Object.entries(quickTasks).forEach(([id, value]) => {
    document.getElementById(id).addEventListener('click', () => { task.value = value; task.focus(); });
  });

  async function sendTask() {
    const userText = task.value.trim();
    if (!userText) { status.textContent = '请先输入任务'; return; }
    const history = [...readHistory(), { role: 'user', content: userText }].slice(-12);
    localStorage.setItem(historyKey(), JSON.stringify(history));
    renderHistory();
    status.textContent = '处理中…';
    response.textContent = '';
    try {
      const result = await fetch('/api/assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task: userText, history, projectId: document.getElementById('project-id').value || 'example', project: JSON.parse(context.value || '{}') })
      });
      const body = await result.json();
      if (!result.ok) throw new Error(body.message || body.error || '请求失败');
      status.textContent = `已完成（${body.skill}）`;
      response.textContent = body.response?.output_text || JSON.stringify(body.response, null, 2);
      history.push({ role: 'assistant', content: response.textContent });
      localStorage.setItem(historyKey(), JSON.stringify(history.slice(-12)));
      renderHistory();
    } catch (error) {
      status.textContent = '未完成';
      response.textContent = error.message;
    }
  }

  document.getElementById('send-task').addEventListener('click', sendTask);
}());
