const test = require('node:test');
const assert = require('node:assert/strict');
const { loadContentSkills, validateContentSkills } = require('../server/content-skills.js');

test('covers_all_workflow_stages', () => {
  const skills = loadContentSkills(require('node:path').join(__dirname, '..'));
  assert.deepEqual(new Set(skills.map(skill => skill.stage)), new Set(['discover', 'plan', 'produce', 'review', 'publish', 'learn']));
});

test('rejects_duplicate_or_unbounded_skill_ids', () => {
  const valid = { id: 'same', name: 'skill', stage: 'discover', keywords: ['x'], description: 'x', deliverable: 'x', evidenceRule: 'x' };
  assert.throws(() => validateContentSkills([
    valid,
    { ...valid }
  ]), /duplicate/i);
  assert.throws(() => validateContentSkills([
    { id: 'a'.repeat(81), stage: 'discover', keywords: ['x'], description: 'x' }
  ]), /invalid/i);
});

test('registry_requires_bounded_fields_and_safe_stage_ids', () => {
  assert.throws(() => validateContentSkills([{ id: 'x', stage: 'publish-now', keywords: ['x'], description: 'x' }]), /invalid/i);
});
