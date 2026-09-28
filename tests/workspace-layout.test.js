const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('shared workspace stylesheet defines a left sidebar and mobile fallback', () => {
  const stylesheet = fs.readFileSync(path.join(root, 'workspace.css'), 'utf8');

  assert.match(stylesheet, /\.workspace-shell/);
  assert.match(stylesheet, /\.workspace-sidebar/);
  assert.match(stylesheet, /\.workspace-main/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)/);
});
