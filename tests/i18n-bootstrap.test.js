const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const messageKeys = {
  name: 'appName',
  description: 'appDescription',
  actionTitle: 'actionTitle',
  commandDescription: 'openSearchCommand'
};

assert.equal(manifest.default_locale, 'en');
assert.equal(manifest.name, `__MSG_${messageKeys.name}__`);
assert.equal(manifest.description, `__MSG_${messageKeys.description}__`);
assert.equal(manifest.action.default_title, `__MSG_${messageKeys.actionTitle}__`);
assert.equal(manifest.commands.open_search.description, `__MSG_${messageKeys.commandDescription}__`);

for (const language of ['en', 'fr']) {
  const catalog = JSON.parse(fs.readFileSync(`_locales/${language}/messages.json`, 'utf8'));
  for (const key of [...Object.values(messageKeys), 'omniboxSuggestion']) {
    assert.ok(catalog[key]?.message, `${language} catalog lacks ${key}`);
  }
}

for (const page of ['onboarding', 'options', 'popup', 'search', 'workspace', 'recap']) {
  const html = fs.readFileSync(`${page}.html`, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  const i18nIndex = scripts.indexOf('src/services/i18n/i18n.js');
  assert.ok(i18nIndex >= 0, `${page} does not load i18n`);
  assert.ok(i18nIndex < scripts.findIndex(script => script.startsWith('src/pages/')), `${page} loads i18n after its page script`);
  if (scripts.includes('src/components/navigation/navbar.js')) {
    assert.ok(i18nIndex < scripts.indexOf('src/components/navigation/navbar.js'), `${page} loads i18n after navbar`);
  }
}

console.log('i18n-bootstrap: manifest, catalogs, and page ordering passed');
