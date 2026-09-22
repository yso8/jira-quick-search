const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const background = fs.readFileSync('background.js', 'utf8');
const search = fs.readFileSync('search.js', 'utf8');
const options = fs.readFileSync('options.html', 'utf8');

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
assert.match(background, /options\.html/);
assert.match(search, /URLSearchParams/);
assert.match(search, /searchInput\.value = initialQuery/);
assert.match(search, /performSearch\(\)/);
assert.match(options, /Ctrl\+Shift\+J/);
assert.match(options, /omnibox/);

console.log('quick-access: 13 tests passed');
