const assert = require('node:assert/strict');
const { classifyIssues, deduplicateIssues, generateMarkdownReport, generateSummary, getBreakdowns, sortTimeline } = require('../report-utils');
const recapHtml = require('node:fs').readFileSync('recap.html', 'utf8');
const recapScript = require('node:fs').readFileSync('recap.js', 'utf8');

const start = new Date('2026-09-16T00:00:00.000Z');
const end = new Date('2026-09-22T23:59:59.999Z');
const issues = [
  { key: 'PROJ-1', summary: 'Terminé', status: 'Done', created: '2026-09-10T10:00:00Z', updated: '2026-09-18T10:00:00Z', project: 'Backend' },
  { key: 'PROJ-2', summary: 'En cours', status: 'In Progress', created: '2026-09-17T10:00:00Z', updated: '2026-09-19T10:00:00Z', project: 'Frontend' },
  { key: 'PROJ-3', summary: 'Créé', status: 'To Do', created: '2026-09-20T10:00:00Z', updated: '2026-09-20T10:00:00Z', project: 'Backend' }
];

const classified = classifyIssues(issues, start, end);
assert.equal(classified.completed.length, 1);
assert.equal(classified.inProgress.length, 2);
assert.equal(classified.created.length, 2);
assert.equal(classified.updated.length, 3);
assert.equal(deduplicateIssues([...issues, issues[0]]).length, 3);

const markdown = generateMarkdownReport(classified, start, end);
assert.match(markdown, /# Bilan d’activité Jira/);
assert.match(markdown, /PROJ-1 — Terminé/);
assert.match(markdown, /Backend: 2/);
assert.doesNotMatch(markdown, /token|authorization/i);
const summary = generateSummary(classified, start, end);
assert.match(summary, /3 tickets correspondent aux critères/);
assert.match(summary, /1 ticket est terminé/);
assert.match(generateSummary({ ...classified, completed: [] }, start, end), /Aucun ticket n’est terminé/);
const breakdowns = getBreakdowns(classified.all);
assert.deepEqual(breakdowns.project, { Backend: 2, Frontend: 1 });
assert.deepEqual(sortTimeline([...issues]).map(issue => issue.key), ['PROJ-3', 'PROJ-2', 'PROJ-1']);
assert.match(recapHtml, /id="customPeriod"/);
assert.match(recapHtml, /report-utils\.js/);
assert.match(recapScript, /classifyIssues/);
assert.match(recapScript, /generateMarkdownReport/);

console.log('report-utils: 10 tests passed');
