const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WORKFLOW_STAGES,
  createContentProject,
  advanceContentProject,
  getNextContentAction
} = require('../workstation/content-workflow.js');

test('creates a six-stage project ready to discover', () => {
  const project = createContentProject({ id: 'launch-1', name: '新品上新', profileId: 'shop-1' });

  assert.deepEqual(WORKFLOW_STAGES.map(stage => stage.id), ['discover', 'plan', 'produce', 'review', 'publish', 'learn']);
  assert.equal(project.workflow.currentStage, 'discover');
  assert.equal(project.workflow.stages.discover.status, 'in_progress');
  assert.equal(project.workflow.stages.plan.status, 'pending');
  assert.equal(project.workflow.nextAction.stage, 'discover');
});

test('legacy_projects_can_initialize_without_an_assigned_profile', () => {
  const project = createContentProject({ id: 'legacy', name: '旧项目', profileId: null });
  assert.equal(project.profileId, null);
  assert.equal(project.workflow.currentStage, 'discover');
});

test('completes the current stage immutably and advances to planning', () => {
  const project = createContentProject({ id: 'launch-1', name: '新品上新', profileId: 'shop-1' });
  const next = advanceContentProject(project, 'discover', {
    status: 'complete', notes: '围绕春季上新整理机会点', sourceRefs: ['商品资料']
  });

  assert.equal(project.workflow.currentStage, 'discover');
  assert.equal(project.workflow.stages.discover.status, 'in_progress');
  assert.equal(next.workflow.stages.discover.status, 'complete');
  assert.equal(next.workflow.currentStage, 'plan');
  assert.equal(next.workflow.stages.plan.status, 'in_progress');
  assert.equal(next.workflow.nextAction.stage, 'plan');
});

test('requires a reason before skipping a stage', () => {
  const project = createContentProject({ id: 'launch-1', name: '新品上新', profileId: 'shop-1' });

  assert.throws(
    () => advanceContentProject(project, 'discover', { status: 'skipped' }),
    /skip reason required/
  );
  const skipped = advanceContentProject(project, 'discover', { status: 'skipped', skippedReason: '已有经确认的选题' });
  assert.equal(skipped.workflow.stages.discover.status, 'skipped');
  assert.equal(skipped.workflow.stages.discover.skippedReason, '已有经确认的选题');
  assert.equal(skipped.workflow.currentStage, 'plan');
});

test('resumes from the saved continuing-from checkpoint', () => {
  const project = createContentProject({ id: 'launch-1', name: '新品上新', profileId: 'shop-1' });
  const paused = advanceContentProject(project, 'discover', {
    status: 'in_progress', notes: '继续补充竞品观察', continuingFrom: 'session-42'
  });

  assert.equal(paused.workflow.continuingFrom, 'session-42');
  assert.deepEqual(getNextContentAction(paused), paused.workflow.nextAction);
  assert.equal(getNextContentAction(paused).stage, 'discover');
});

test('rejects unknown and out-of-order stages', () => {
  const project = createContentProject({ id: 'launch-1', name: '新品上新', profileId: 'shop-1' });

  assert.throws(() => advanceContentProject(project, 'unknown', { status: 'complete' }), /unknown workflow stage/);
  assert.throws(() => advanceContentProject(project, 'produce', { status: 'complete' }), /only current stage can change/);
});
