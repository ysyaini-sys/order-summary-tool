const fs = require('node:fs');
const path = require('node:path');

const STAGES = new Set(['discover', 'plan', 'produce', 'review', 'publish', 'learn']);

function validateContentSkills(skills) {
  if (!Array.isArray(skills) || skills.length > 100) throw new Error('invalid skill registry');
  const ids = new Set();
  for (const skill of skills) {
    if (!skill || typeof skill !== 'object' || !/^[a-z][a-z0-9-]{0,59}$/.test(skill.id || '')) throw new Error('invalid skill id');
    if (ids.has(skill.id)) throw new Error(`duplicate skill id: ${skill.id}`);
    ids.add(skill.id);
    if (typeof skill.name !== 'string' || !skill.name.trim() || skill.name.length > 80 || !STAGES.has(skill.stage)) throw new Error(`invalid skill: ${skill.id}`);
    if (!Array.isArray(skill.keywords) || !skill.keywords.length || skill.keywords.length > 20 || skill.keywords.some(keyword => typeof keyword !== 'string' || !keyword.trim() || keyword.length > 80)) {
      throw new Error(`invalid skill keywords: ${skill.id}`);
    }
    for (const field of ['description', 'deliverable', 'evidenceRule']) {
      if (typeof skill[field] !== 'string' || !skill[field].trim() || skill[field].length > 1000) throw new Error(`invalid skill ${field}: ${skill.id}`);
    }
  }
  return skills;
}

function loadContentSkills(root) {
  const file = path.join(root, 'workstation', 'content-skills.json');
  return validateContentSkills(JSON.parse(fs.readFileSync(file, 'utf8')));
}

module.exports = { loadContentSkills, validateContentSkills };
