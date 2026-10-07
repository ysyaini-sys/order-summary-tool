const WORKFLOW_STAGES = Object.freeze([
  { id: 'discover', label: '发现' },
  { id: 'plan', label: '策划' },
  { id: 'produce', label: '创作' },
  { id: 'review', label: '审核' },
  { id: 'publish', label: '发布准备' },
  { id: 'learn', label: '复盘' }
]);

const stageIds = new Set(WORKFLOW_STAGES.map(stage => stage.id));

function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function nextActionFor(stage) {
  const item = WORKFLOW_STAGES.find(entry => entry.id === stage);
  return item ? { stage: item.id, label: `继续${item.label}阶段` } : { stage: null, label: '项目流程已完成' };
}

function createContentProject({ id, name, profileId }) {
  if (!validId(id)) throw new Error('invalid project id');
  if (typeof name !== 'string' || !name.trim() || name.length > 160) throw new Error('invalid project name');
  if (!validId(profileId)) throw new Error('invalid profile id');

  const stages = Object.fromEntries(WORKFLOW_STAGES.map(({ id: stage }, index) => [stage, {
    status: index === 0 ? 'in_progress' : 'pending',
    notes: '',
    sourceRefs: [],
    updatedAt: null
  }]));

  return {
    id,
    name: name.trim(),
    profileId,
    status: 'active',
    outputs: [],
    workflow: {
      currentStage: 'discover',
      nextAction: nextActionFor('discover'),
      continuingFrom: null,
      stages
    }
  };
}

function advanceContentProject(project, stage, patch = {}) {
  if (!stageIds.has(stage)) throw new Error('unknown workflow stage');
  const workflow = project?.workflow;
  if (!workflow || workflow.currentStage !== stage || !workflow.stages?.[stage]) {
    throw new Error('only current stage can change');
  }

  const status = patch.status || 'in_progress';
  if (!['in_progress', 'complete', 'skipped'].includes(status)) throw new Error('invalid workflow status');
  const skippedReason = typeof patch.skippedReason === 'string' ? patch.skippedReason.trim() : '';
  if (status === 'skipped' && !skippedReason) throw new Error('skip reason required');
  if (patch.notes !== undefined && (typeof patch.notes !== 'string' || patch.notes.length > 10000)) {
    throw new Error('invalid workflow notes');
  }
  if (patch.sourceRefs !== undefined && (!Array.isArray(patch.sourceRefs) || patch.sourceRefs.length > 100 || patch.sourceRefs.some(item => typeof item !== 'string' || item.length > 300))) {
    throw new Error('invalid workflow sources');
  }
  if (patch.continuingFrom !== undefined && patch.continuingFrom !== null && (typeof patch.continuingFrom !== 'string' || patch.continuingFrom.length > 200)) {
    throw new Error('invalid continuation source');
  }

  const stageIndex = WORKFLOW_STAGES.findIndex(item => item.id === stage);
  const followingStage = WORKFLOW_STAGES[stageIndex + 1]?.id || null;
  const updatedStage = {
    ...workflow.stages[stage],
    status,
    updatedAt: new Date().toISOString()
  };
  if (patch.notes !== undefined) updatedStage.notes = patch.notes;
  if (patch.sourceRefs !== undefined) updatedStage.sourceRefs = [...patch.sourceRefs];
  if (status === 'skipped') updatedStage.skippedReason = skippedReason;

  const stages = { ...workflow.stages, [stage]: updatedStage };
  if (status !== 'in_progress' && followingStage) {
    stages[followingStage] = { ...stages[followingStage], status: 'in_progress' };
  }

  return {
    ...project,
    workflow: {
      ...workflow,
      currentStage: status === 'in_progress' ? stage : followingStage,
      nextAction: nextActionFor(status === 'in_progress' ? stage : followingStage),
      continuingFrom: patch.continuingFrom === undefined ? workflow.continuingFrom : patch.continuingFrom,
      stages
    }
  };
}

function getNextContentAction(project) {
  return project?.workflow?.nextAction || nextActionFor(project?.workflow?.currentStage || null);
}

module.exports = { WORKFLOW_STAGES, createContentProject, advanceContentProject, getNextContentAction };
