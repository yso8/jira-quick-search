const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('options.html', 'utf8');
const script = fs.readFileSync('options.js', 'utf8');
const background = fs.readFileSync('background.js', 'utf8');

assert.match(html, /Jira-Quick-Search/);
assert.match(html, /Recherchez rapidement des tickets/);
assert.match(html, /Filtrez et ouvrez plusieurs résultats/);
assert.match(html, /Retrouvez votre activité Jira/);
assert.match(html, /id="connectBtn"/);
assert.match(html, /id="retryBtn"/);
assert.match(html, /type="password"/);
assert.match(script, /chrome\.storage\.sync\.set\(\{ jiraUrl: url, jiraEmail: email, jiraToken: token \}\)/);
assert.match(script, /window\.location\.href = 'search\.html'/);
assert.match(script, /Connexion réussie/);
assert.match(script, /Impossible de se connecter/);
assert.match(script, /retryBtn/);
assert.match(background, /chrome\.runtime\.openOptionsPage\(\)/);
assert.match(background, /chrome\.tabs\.create\(\{\s*url: chrome\.runtime\.getURL\('search\.html'\)/s);
assert.match(background, /config\.jiraUrl && config\.jiraEmail && config\.jiraToken/);

console.log('onboarding: 13 tests passed');
