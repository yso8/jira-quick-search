const assert = require('node:assert/strict');
const {
  validateFeedback,
  buildFeedbackBody,
  buildGithubIssueUrl,
  buildTechnicalInfo
} = require('../feedback-utils.js');

assert.deepEqual(validateFeedback({ type: '', title: '', description: '' }), {
  valid: false,
  message: 'Sélectionnez un type de feedback.'
});
assert.equal(validateFeedback({ type: 'bug', title: '', description: 'Détail' }).message, 'Ajoutez un titre à votre feedback.');
assert.equal(validateFeedback({ type: 'bug', title: 'Bug', description: '' }).message, 'Décrivez brièvement le problème avant de continuer.');
assert.equal(validateFeedback({ type: 'question', title: 'Question', description: 'Détail' }).valid, true);

const technical = buildTechnicalInfo({ version: '1.2.3', browser: 'Chrome', platform: 'Windows', manifestVersion: 3, instanceType: 'Cloud', diagnosticStatus: 'Connexion valide' });
const body = buildFeedbackBody({ type: 'bug', title: 'Recherche lente', description: 'La recherche prend trop de temps.', reproducible: true, includeTechnical: true, technicalInfo: technical });
assert.match(body, /## Description/);
assert.match(body, /La recherche prend trop de temps/);
assert.match(body, /reproductible/i);
assert.match(body, /1\.2\.3/);
assert.doesNotMatch(body, /jiraToken|Authorization|PROJ-123|example\.atlassian\.net/i);

const url = buildGithubIssueUrl({ type: 'bug', title: 'Recherche lente', body });
assert.match(url, /^https:\/\/github\.com\/yso8\/jira-quick-search\/issues\/new\?/);
assert.doesNotMatch(url, /token|authorization|atlassian\.net/i);
assert.equal(new URL(url).searchParams.get('title'), 'Recherche lente');

console.log('feedback-utils: 12 tests passed');
