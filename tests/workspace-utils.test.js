const assert = require('node:assert/strict');
const { addRecentIssue, togglePinnedIssue, getPinnedIssueState, saveSearch, removeById } = require('../workspace-utils');

const issue = { key: 'PROJ-1', summary: 'Résumé', status: 'En cours', priority: 'High', updated: '2026-09-22T10:00:00Z', url: 'https://demo.atlassian.net/browse/PROJ-1' };
let recents = addRecentIssue([], issue, 2);
recents = addRecentIssue(recents, { ...issue, summary: 'Mis à jour' }, 2);
assert.equal(recents.length, 1);
assert.equal(recents[0].summary, 'Mis à jour');
assert.deepEqual(addRecentIssue(recents, { key: 'PROJ-2' }, 2).map(item => item.key), ['PROJ-2', 'PROJ-1']);

let pinned = togglePinnedIssue([], issue);
assert.equal(pinned.length, 1);
assert.equal(togglePinnedIssue(pinned, issue).length, 0);
assert.deepEqual(getPinnedIssueState(pinned, issue.key), {
  pinned: true,
  icon: '★',
  label: 'Désépingler ce ticket'
});
assert.deepEqual(getPinnedIssueState([], issue.key), {
  pinned: false,
  icon: '☆',
  label: 'Épingler ce ticket'
});

const saved = saveSearch([], { name: 'Mes tickets', query: 'project = PROJ', filters: { project: 'PROJ' } });
assert.equal(saved[0].name, 'Mes tickets');
assert.equal(saved[0].query, 'project = PROJ');
assert.equal(removeById(saved, saved[0].id).length, 0);

console.log('workspace-utils: 9 tests passed');
