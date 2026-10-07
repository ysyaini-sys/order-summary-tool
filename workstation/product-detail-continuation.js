const REQUIRED_IDENTITY = [
  ['product.name', value => Boolean(value)],
  ['product.heroAsset', value => Boolean(value)],
  ['product.specification', value => Boolean(value)],
  ['platforms', value => Array.isArray(value) && value.length > 0]
];

function createCheckpoint(input) {
  const missingRequired = REQUIRED_IDENTITY
    .filter(([key, valid]) => {
      const value = key === 'platforms' ? input.platforms : key.split('.').reduce((obj, part) => obj?.[part], input);
      return !valid(value);
    })
    .map(([key]) => key);

  const claims = (input.claims || []).map(claim => ({
    text: claim.text,
    evidence: claim.evidence || '未提供',
    state: claim.state || 'needs-proof'
  }));

  return {
    version: 1,
    projectId: input.projectId,
    continuingFrom: { type: 'product-detail-page', source: input.source || null },
    task: input.task || '商品详情页',
    product: input.product || {},
    platforms: input.platforms || [],
    claims,
    completed: input.completed || [],
    current: input.current || 'product-brief',
    next: input.next || '补齐商品设计资料清单',
    missingRequired,
    status: missingRequired.length ? 'BLOCKED_IDENTITY' : (input.next ? 'READY_WITH_GAPS' : 'READY'),
    updatedAt: input.updatedAt || new Date().toISOString()
  };
}

function resumeCheckpoint(checkpoint) {
  const missingRequired = checkpoint.missingRequired || [];
  const canUseClaimsInFinal = (checkpoint.claims || []).every(claim => claim.state !== 'needs-proof');
  return {
    projectId: checkpoint.projectId,
    status: checkpoint.status,
    current: checkpoint.current,
    next: checkpoint.next,
    completed: checkpoint.completed || [],
    canContinue: checkpoint.status !== 'BLOCKED_IDENTITY',
    canUseClaimsInFinal,
    missingRequired
  };
}

module.exports = { createCheckpoint, resumeCheckpoint };
