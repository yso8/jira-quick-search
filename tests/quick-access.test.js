const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

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
assert.match(searchHtml, /id="resultCount"[^>]*aria-live="polite"/);

async function verifyOmnibox(language, expectedDescription) {
  const listeners = {};
  const context = {
    chrome: {
      commands: { onCommand: { addListener(listener) { listeners.command = listener; } } },
      omnibox: {
        onInputChanged: { addListener(listener) { listeners.changed = listener; } },
        onInputEntered: { addListener(listener) { listeners.entered = listener; } }
      },
      storage: { local: { get: async () => { throw new Error('language must use sync storage'); } }, sync: { get: async () => ({ language }) } },
      i18n: { getUILanguage: () => 'en-US' },
      runtime: { getURL: page => page, onInstalled: { addListener() {} } },
      tabs: { create() {} }
    },
    fetch: async path => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path, 'utf8')) }),
    importScripts(...paths) {
      for (const path of paths) {
        if (path.endsWith('/i18n.js')) vm.runInContext(fs.readFileSync(path, 'utf8'), context);
      }
    },
    console
  };
  vm.createContext(context);
  vm.runInContext(background, context);
  assert.equal(typeof listeners.command, 'function');
  assert.equal(typeof listeners.changed, 'function');
  assert.equal(typeof listeners.entered, 'function');
  const suggestions = input => new Promise(resolve => listeners.changed(input, value => resolve(JSON.parse(JSON.stringify(value)))));
  assert.deepEqual(await suggestions(''), []);
  assert.deepEqual(await suggestions('   '), []);
  assert.deepEqual(await suggestions('incident'), [{ content: 'incident', description: expectedDescription }]);
}

Promise.all([
  verifyOmnibox('fr', 'Rechercher dans Jira : incident'),
  verifyOmnibox('en', 'Search Jira: incident')
]).then(() => console.log('quick-access: omnibox registration and localization passed')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
