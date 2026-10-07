(() => {
  const stageLabels = { discover: '发现', plan: '策划', produce: '生产', review: '审核', publish: '发布准备', learn: '复盘' };
  const state = { profiles: [], projects: [], skills: [], project: null, profile: null, aiConfigured: false };
  const $ = id => document.getElementById(id);
  const status = message => { $('workspace-status').textContent = message; };
  const setOptions = (select, items, selected, label) => {
    select.replaceChildren();
    for (const item of items) {
      const option = document.createElement('option'); option.value = item.id; option.textContent = label(item); select.append(option);
    }
    if (selected) select.value = selected;
  };
  const request = async (url, options) => {
    const response = await fetch(url, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || body.error || `请求失败 ${response.status}`);
    return body;
  };
  function renderStages() {
    const holder = $('workflow-stages'); holder.replaceChildren();
    const workflow = state.project?.workflow;
    if (!workflow) { holder.textContent = '请先选择或新建 Project。'; return; }
    Object.entries(stageLabels).forEach(([id, label], index) => {
      const item = workflow.stages[id];
      const row = document.createElement('div'); row.className = `cc-stage${workflow.currentStage === id ? ' current' : ''}${item.status === 'complete' ? ' completed' : ''}`;
      const number = document.createElement('span'); number.className = 'cc-stage-num'; number.textContent = String(index + 1);
      const copy = document.createElement('div'); const title = document.createElement('div'); title.className = 'cc-stage-title'; title.textContent = label;
      const note = document.createElement('div'); note.className = 'cc-stage-note'; note.textContent = item.notes || (workflow.currentStage === id ? workflow.nextAction.label : ''); copy.append(title, note);
      const stateLabel = document.createElement('span'); stateLabel.className = 'cc-stage-state'; stateLabel.textContent = item.status === 'complete' ? '已完成' : item.status === 'in_progress' ? '进行中' : item.status === 'skipped' ? '已跳过' : '待开始';
      row.append(number, copy, stateLabel); holder.append(row);
    });
    const current = workflow.stages[workflow.currentStage];
    $('stage-notes').value = current?.notes || '';
    $('stage-sources').value = (current?.sourceRefs || []).join('\n');
    for (const id of ['save-checkpoint', 'complete-stage', 'skip-stage']) $(id).disabled = !workflow.currentStage;
  }
  function renderSkills() {
    const holder = $('skill-list'); holder.replaceChildren();
    for (const skill of state.skills) {
      const card = document.createElement('div'); card.className = 'cc-skill';
      const head = document.createElement('div'); head.className = 'cc-skill-head';
      const name = document.createElement('span'); name.className = 'cc-skill-name'; name.textContent = skill.name;
      const stage = document.createElement('span'); stage.className = 'cc-skill-stage'; stage.textContent = stageLabels[skill.stage] || skill.stage;
      const desc = document.createElement('p'); desc.textContent = `${skill.description} 交付：${skill.deliverable}`;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = '用这个 Skill 写任务';
      button.addEventListener('click', () => { $('skill-task').value = `${skill.name}：请基于当前 Project 资料开始工作。`; $('skill-task').focus(); });
      head.append(name, stage); card.append(head, desc, button); holder.append(card);
    }
  }
  async function loadProject(id) {
    if (!id) { state.project = null; renderStages(); return; }
    const result = await request(`/api/content/projects/${encodeURIComponent(id)}`);
    state.project = result.project; state.outputs = result.outputs || [];
    const matchingProfile = state.profiles.find(item => item.id === state.project.profileId);
    if (matchingProfile) { state.profile = matchingProfile; $('profile-select').value = matchingProfile.id; }
    const output = $('output-list'); output.textContent = state.outputs.length ? `已归档 ${state.outputs.length} 个 AI 产物版本。` : '暂时没有归档产物。';
    renderStages(); $('ask-ai').disabled = !state.aiConfigured;
  }
  async function saveStage(statusValue) {
    if (!state.project?.workflow?.currentStage) return;
    const stage = state.project.workflow.currentStage;
    const notes = $('stage-notes').value;
    const sourceRefs = $('stage-sources').value.split('\n').map(item => item.trim()).filter(Boolean);
    const result = await request(`/api/content/projects/${encodeURIComponent(state.project.id)}/advance`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage, patch: { status: statusValue, notes, sourceRefs, ...(statusValue === 'skipped' ? { skippedReason: notes } : {}) } })
    });
    state.project = result; renderStages(); status(statusValue === 'in_progress' ? '断点已保存在本机。' : '阶段已更新，项目可从新断点继续。');
  }
  $('profile-select').addEventListener('change', () => { state.profile = state.profiles.find(item => item.id === $('profile-select').value) || null; });
  $('project-select').addEventListener('change', async () => {
    try { await loadProject($('project-select').value); status('已恢复所选 Project 的工作断点。'); } catch (error) { status(error.message); }
  });
  $('create-project-form').addEventListener('submit', async event => {
    event.preventDefault();
    const name = $('new-project-name').value.trim();
    if (!name || !state.profile) return status('请先选择 Profile 并填写项目名称。');
    const id = `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const project = await request('/api/content/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, name, profileId: state.profile.id }) });
      state.projects.push(project); setOptions($('project-select'), state.projects, project.id, item => item.name); state.project = project; $('ask-ai').disabled = !state.aiConfigured; renderStages(); $('new-project-name').value = ''; status('新 Project 已创建并保存在本机。');
    } catch (error) { status(error.message); }
  });
  $('create-profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const name = $('new-profile-name').value.trim();
    if (!name) return status('请填写 Profile 名称。');
    const list = id => $(id).value.split(',').map(item => item.trim()).filter(Boolean);
    const profile = {
      id: `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name, platforms: list('profile-platforms'), audience: list('profile-audience'), style: list('profile-style'), boundaries: list('profile-boundaries')
    };
    try {
      const saved = await request('/api/content/profiles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) });
      state.profiles.push(saved); state.profile = saved; setOptions($('profile-select'), state.profiles, saved.id, item => item.name);
      $('create-profile-form').reset(); status('新 Profile 已保存到本机；可以用它创建 Project。');
    } catch (error) { status(error.message); }
  });
  $('save-checkpoint').addEventListener('click', () => saveStage('in_progress').catch(error => status(error.message)));
  $('complete-stage').addEventListener('click', () => saveStage('complete').catch(error => status(error.message)));
  $('skip-stage').addEventListener('click', () => {
    const reason = window.prompt('请说明跳过本阶段的原因（将保存到阶段记录中）：');
    if (reason?.trim()) { $('stage-notes').value = reason.trim(); saveStage('skipped').catch(error => status(error.message)); }
  });
  $('export-project').addEventListener('click', () => {
    if (!state.project) return;
    const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${state.project.id}.json`; link.click(); URL.revokeObjectURL(link.href);
  });
  $('ask-ai').addEventListener('click', async () => {
    if (!state.project || !state.aiConfigured) return;
    $('ask-ai').disabled = true; $('ai-result').textContent = 'AI 正在处理…';
    try {
      const result = await request('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: $('skill-task').value, projectId: state.project.id, profileId: state.profile?.id, project: { project: state.project, profile: state.profile } }) });
      $('ai-result').textContent = result.response?.output_text || JSON.stringify(result.response, null, 2);
      await loadProject(state.project.id);
    } catch (error) { $('ai-result').textContent = error.message; }
    finally { $('ask-ai').disabled = !state.aiConfigured; }
  });
  async function init() {
    try {
      const [profiles, projects, skills, health] = await Promise.all([
        request('/api/content/profiles'), request('/api/content/projects'), request('/api/content/skills'), request('/health')
      ]);
      state.profiles = profiles.profiles; state.projects = projects.projects; state.skills = skills.skills; state.aiConfigured = health.aiConfigured;
      setOptions($('profile-select'), state.profiles, state.profiles[0]?.id, item => item.name);
      state.profile = state.profiles[0] || null;
      setOptions($('project-select'), state.projects, state.projects[0]?.id, item => item.name);
      renderSkills();
      $('ai-status').textContent = state.aiConfigured ? `本机 AI 已配置（${health.provider || '已连接'}）。只有点击请求后才发送当前任务和项目上下文。` : '本机 AI 尚未配置。项目创建、阶段记录、恢复与导出均可离线使用。';
      $('ask-ai').disabled = !state.aiConfigured || !state.projects.length;
      await loadProject(state.projects[0]?.id);
      status(state.projects.length ? '工作区已就绪。' : '还没有 Project，请创建一个开始使用。');
    } catch (error) { status(`工作区读取失败：${error.message}`); }
  }
  init();
})();
