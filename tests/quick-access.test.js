const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const background = fs.readFileSync('background.js', 'utf8');
const search = fs.readFileSync('src/pages/search/search.js', 'utf8');
const options = fs.readFileSync('options.html', 'utf8');
const searchHtml = fs.readFileSync('search.html', 'utf8');

assert.equal(manifest.omnibox.keyword, 'jira');
assert.equal(manifest.commands.open_search.suggested_key.default, 'Ctrl+Shift+J');
assert.match(background, /chrome\.commands\.onCommand/);
assert.match(background, /openQuickSearchPopup/);
assert.match(background, /command === 'open_search'\) openQuickSearchPopup/);
assert.match(background, /chrome\.omnibox\.onInputChanged/);
assert.match(background, /chrome\.omnibox\.onInputEntered/);
assert.match(background, /isJiraIssueKey/);
assert.match(background, /\/browse\//);
assert.match(background, /search\.html.*q=/s);
assert.match(background, /onboarding\.html/);
assert.match(search, /URLSearchParams/);
assert.match(search, /searchInput\.value = initialQuery/);
assert.match(search, /performSearch\(\)/);
assert.match(options, /chrome:\/\/extensions\/shortcuts/);
assert.match(options, /Revoir l’introduction/);
assert.match(searchHtml, /id="resultCount"[^>]*aria-live="polite"/);

console.log('quick-access: 13 tests passed');
