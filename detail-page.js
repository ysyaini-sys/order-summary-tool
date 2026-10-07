(function () {
  function buildCheckpoint(input) {
    const missingRequired = [];
    if (!input.productName) missingRequired.push('product.name');
    if (!input.heroAsset) missingRequired.push('product.heroAsset');
    if (!input.specification) missingRequired.push('product.specification');
    if (!input.platform) missingRequired.push('platforms');
    return {
      version: 1,
      projectId: input.projectId || 'product-detail-project',
      continuingFrom: { type: 'product-detail-page', source: input.source || null },
      task: '商品详情页',
      product: { name: input.productName || '', heroAsset: input.heroAsset || '', specification: input.specification || '' },
      platforms: input.platform ? [input.platform] : [],
      completed: input.completed || [],
      current: input.currentStep || 'product-brief',
      next: input.nextStep || '补齐商品设计资料清单',
      claims: input.coreClaim ? [{ text: input.coreClaim, state: input.evidenceState || 'needs-proof' }] : [],
      blueprint: input.blueprint || '',
      canUseClaimsInFinal: !input.coreClaim || input.evidenceState === 'verified' || input.evidenceState === 'provided-unverified',
      missingRequired,
      status: missingRequired.length ? 'BLOCKED_IDENTITY' : 'READY_WITH_GAPS',
      updatedAt: new Date().toISOString()
    };
  }

  function applyCheckpoint(checkpoint) {
    document.getElementById('project-id').value = checkpoint.projectId || '';
    document.getElementById('continuing-source').value = checkpoint.continuingFrom?.source || '';
    document.getElementById('product-name').value = checkpoint.product?.name || '';
    document.getElementById('hero-asset').value = checkpoint.product?.heroAsset || '';
    document.getElementById('specification').value = checkpoint.product?.specification || '';
    document.getElementById('platform').value = checkpoint.platforms?.[0] || '';
    document.getElementById('current-step').value = checkpoint.current || '';
    document.getElementById('next-step').value = checkpoint.next || '';
    document.getElementById('core-claim').value = checkpoint.claims?.[0]?.text || '';
    document.getElementById('evidence-state').value = checkpoint.claims?.[0]?.state || 'needs-proof';
    document.getElementById('page-blueprint').value = checkpoint.blueprint || '';
    ['product-brief', 'storyboard', 'art-direction', 'visual-master', 'qa'].forEach(step => {
      const checkbox = document.getElementById(`completed-step-${step}`);
      if (checkbox) checkbox.checked = (checkpoint.completed || []).includes(step);
    });
  }

  function downloadCheckpoint(checkpoint) {
    const blob = new Blob([JSON.stringify(checkpoint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${checkpoint.projectId || 'product-detail'}-continuation.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importCheckpoint(file, onLoaded) {
    const reader = new FileReader();
    reader.onload = () => onLoaded(JSON.parse(reader.result));
    reader.readAsText(file);
  }

  function setup() {
    const fields = ['product-name', 'hero-asset', 'specification', 'platform', 'current-step', 'next-step'];
    const read = () => buildCheckpoint({
      projectId: document.getElementById('project-id').value.trim(),
      source: document.getElementById('continuing-source').value.trim(),
      productName: document.getElementById('product-name').value.trim(),
      heroAsset: document.getElementById('hero-asset').value.trim(),
      specification: document.getElementById('specification').value.trim(),
      platform: document.getElementById('platform').value,
      currentStep: document.getElementById('current-step').value,
      nextStep: document.getElementById('next-step').value
      ,coreClaim: document.getElementById('core-claim').value.trim()
      ,evidenceState: document.getElementById('evidence-state').value
      ,blueprint: document.getElementById('page-blueprint').value
      ,completed: ['product-brief', 'storyboard', 'art-direction', 'visual-master', 'qa'].filter(step => document.getElementById(`completed-step-${step}`)?.checked)
    });
    const render = checkpoint => {
      document.getElementById('status').textContent = checkpoint.status;
      document.getElementById('checkpoint').textContent = JSON.stringify(checkpoint, null, 2);
    };
    document.getElementById('save-checkpoint').onclick = () => {
      const checkpoint = read();
      localStorage.setItem('product-detail-checkpoint', JSON.stringify(checkpoint));
      render(checkpoint);
    };
    document.getElementById('resume-checkpoint').onclick = () => {
      const saved = localStorage.getItem('product-detail-checkpoint');
      if (saved) {
        const checkpoint = JSON.parse(saved);
        applyCheckpoint(checkpoint);
        render(checkpoint);
      }
    };
    document.getElementById('export-checkpoint').onclick = () => downloadCheckpoint(read());
    document.getElementById('import-checkpoint').onchange = event => {
      const file = event.target.files?.[0];
      if (file) importCheckpoint(file, checkpoint => { applyCheckpoint(checkpoint); render(checkpoint); });
    };
    document.getElementById('ask-ai').onclick = async () => {
      const checkpoint = read();
      if (checkpoint.status === 'BLOCKED_IDENTITY') {
        document.getElementById('ai-status').textContent = `请先补齐：${checkpoint.missingRequired.join('、')}`;
        return;
      }
      document.getElementById('ai-status').textContent = '正在请求 AI…';
      document.getElementById('ai-result').textContent = '';
      try {
        const result = await fetch('/api/assistant', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            task: `继续商品详情页项目。当前步骤：${checkpoint.current}。下一步：${checkpoint.next}。请按专用结构输出。`,
            projectId: checkpoint.projectId,
            project: { ...checkpoint, id: checkpoint.projectId },
            profile: {}
          })
        });
        const body = await result.json();
        if (!result.ok) throw new Error(body.message || body.error || 'AI 请求失败');
        document.getElementById('ai-status').textContent = body.archive ? `结果已归档为版本 v${body.archive.version}` : 'AI 已返回';
        document.getElementById('ai-result').textContent = body.response?.output_text || JSON.stringify(body.response, null, 2);
      } catch (error) {
        document.getElementById('ai-status').textContent = 'AI 请求未完成';
        document.getElementById('ai-result').textContent = error.message;
      }
    };
    fields.forEach(id => {
      const field = document.getElementById(id);
      if (field && typeof field.addEventListener === 'function') field.addEventListener('input', () => render(read()));
    });
    render(read());
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.buildCheckpoint = buildCheckpoint;
    globalThis.applyCheckpoint = typeof applyCheckpoint === 'function' ? applyCheckpoint : undefined;
    globalThis.downloadCheckpoint = downloadCheckpoint;
    globalThis.importCheckpoint = importCheckpoint;
  }
  if (typeof document !== 'undefined' && document.getElementById('save-checkpoint')) setup();
  if (typeof module !== 'undefined') module.exports = { buildCheckpoint };
}());
