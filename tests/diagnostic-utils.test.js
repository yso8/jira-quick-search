const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  validateDiagnosticUrl,
  classifyDiagnosticError,
  runConnectionDiagnostics,
  clearExtensionData,
  createTechnicalDetails
} = require('../diagnostic-utils.js');

assert.deepEqual(validateDiagnosticUrl(''), { status: 'error', message: 'URL Jira absente.' });
assert.equal(validateDiagnosticUrl('http://example.atlassian.net').status, 'error');
assert.equal(validateDiagnosticUrl('https://example.atlassian.net').status, 'success');

assert.equal(classifyDiagnosticError({ status: 401 }).kind, 'authentication');
assert.equal(classifyDiagnosticError({ status: 403 }).kind, 'permission');
assert.equal(classifyDiagnosticError(new TypeError('Failed to fetch')).kind, 'network');
assert.doesNotMatch(createTechnicalDetails({ overall: 'error', checks: [{ id: 'authentication', label: 'Authentification', status: 'error', token: 'secret', authorization: 'Basic secret' }] }), /secret|authorization/i);
const apiSource = fs.readFileSync('jira-api.js', 'utf8');
const optionsSource = fs.readFileSync('options.js', 'utf8');
assert.doesNotMatch(apiSource, /responseText/);
assert.doesNotMatch(apiSource, /\$\{[^}]*token[^}]*\}[^`]*\?/i);
assert.match(optionsSource, /if \(!window\.confirm\(/);

(async () => {
  let calls = 0;
  const result = await runConnectionDiagnostics({
    jiraUrl: 'https://example.atlassian.net',
    jiraEmail: 'user@example.com',
    jiraToken: 'secret'
  }, {
    request: async (_config, path, options) => {
      calls += 1;
      assert.equal(options.method, path.includes('/search/') ? 'POST' : 'GET');
      return { ok: true, status: 200, json: async () => ({ issues: [] }) };
    }
  });
  assert.equal(calls, 2);
  assert.equal(result.overall, 'success');
  assert.equal(result.checks.find(check => check.id === 'search').status, 'success');

  const missingToken = await runConnectionDiagnostics({ jiraUrl: 'https://example.atlassian.net', jiraEmail: 'user@example.com' }, { request: async () => { throw new Error('must not call Jira'); } });
  assert.equal(missingToken.checks.find(check => check.id === 'authentication').status, 'error');

  let storage = {
    sync: { clear: async () => { storage.sync.cleared = true; }, cleared: false },
    local: { clear: async () => { storage.local.cleared = true; }, cleared: false }
  };
  await clearExtensionData(storage);
  assert.equal(storage.sync.cleared, true);
  assert.equal(storage.local.cleared, true);
  console.log('diagnostic-utils: 11 tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
