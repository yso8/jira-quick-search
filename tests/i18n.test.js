const assert = require('node:assert/strict');
const path = require('node:path');
const modulePath = path.resolve(__dirname, '../src/services/i18n/i18n.js');
const originalGlobals = new Map(['chrome', 'fetch', 'JiraQuickSearchI18n'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

function freshI18n() {
  delete require.cache[modulePath];
  return require(modulePath);
}

function restoreGlobals() {
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  delete require.cache[modulePath];
}

function fakeElement(dataset = {}) {
  return {
    dataset,
    attributes: {},
    textContent: '',
    setAttribute(name, value) { this.attributes[name] = value; }
  };
}

(async () => {
  try {
    const { resolveLanguage } = freshI18n();
    assert.equal(resolveLanguage('auto', 'fr-CA'), 'fr');
    assert.equal(resolveLanguage(undefined, 'fr-FR'), 'fr');
    assert.equal(resolveLanguage('auto', 'de-DE'), 'en');
    assert.equal(resolveLanguage('en', 'fr'), 'en');
    assert.equal(resolveLanguage('fr', 'en'), 'fr');

    const storageCalls = [];
    let storedPreference;
    global.chrome = { storage: { local: { get: async () => { throw new Error('language must use sync storage'); } }, sync: {
      get: async key => { storageCalls.push(['get', key]); return storedPreference === undefined ? {} : { [key]: storedPreference }; },
      set: async value => { storageCalls.push(['set', value]); storedPreference = value.language; },
      remove: async key => { storageCalls.push(['remove', key]); storedPreference = undefined; }
    } } };
    let i18n = freshI18n();
    assert.equal(await i18n.getLanguagePreference(), 'auto');
    assert.deepEqual(storageCalls, [['get', 'language']]);
    assert.equal(storedPreference, undefined, 'a missing preference is auto without writing it');
    await i18n.setLanguagePreference('fr');
    assert.equal(await i18n.getLanguagePreference(), 'fr');
    await i18n.setLanguagePreference('auto');
    assert.equal(await i18n.getLanguagePreference(), 'auto');
    assert.equal(storedPreference, undefined, 'switching back to auto removes the explicit preference');

    const frCatalog = {
      greeting: { message: 'Bonjour $name$ ($1)!', placeholders: { name: { content: '$1' } } },
      escaped: { message: 'Cost $$5; value $1; named $name$', placeholders: { name: { content: '$2' } } },
      label: { message: 'Français' }, hint: { message: 'Rechercher ici' },
      title: { message: 'Rechercher' }, aria: { message: 'Champ de recherche' }
    };
    const enCatalog = {
      onlyEnglish: { message: 'English fallback' },
      label: { message: 'English' }, hint: { message: 'Search here' },
      title: { message: 'Search' }, aria: { message: 'Search field' }
    };
    const fetchedUrls = [];
    global.chrome.runtime = { getURL: url => `chrome-extension://unit/${url}` };
    global.chrome.i18n = { getUILanguage: () => 'fr-CA' };
    global.fetch = async url => {
      fetchedUrls.push(url);
      if (url.endsWith('/_locales/fr/messages.json')) return { ok: true, json: async () => frCatalog };
      if (url.endsWith('/_locales/en/messages.json')) return { ok: true, json: async () => enCatalog };
      throw new Error(`Unexpected catalog URL: ${url}`);
    };

    i18n = freshI18n();
    assert.equal(await i18n.getLanguagePreference(), 'auto');
    assert.deepEqual(storageCalls.slice(-1), [['get', 'language']]);
    assert.equal(await i18n.initI18n(), 'fr');
    assert.deepEqual(fetchedUrls, [
      'chrome-extension://unit/_locales/fr/messages.json',
      'chrome-extension://unit/_locales/en/messages.json'
    ]);
    assert.equal(i18n.t('greeting', 'Ada'), 'Bonjour Ada (Ada)!');
    assert.equal(i18n.t('escaped', ['$2', 'TWO']), 'Cost $5; value $2; named TWO');
    assert.equal(i18n.t('onlyEnglish'), 'English fallback');
    assert.equal(i18n.t('missing.key'), 'missing.key');

    const child = fakeElement({
      i18n: 'label', i18nPlaceholder: 'hint', i18nTitle: 'title', i18nAriaLabel: 'aria'
    });
    const root = fakeElement({ i18n: 'label' });
    root.querySelectorAll = () => [child];
    i18n.applyTranslations(root);
    assert.equal(root.textContent, 'Français', 'the supplied root is translated');
    assert.equal(child.textContent, 'Français');
    assert.equal(child.attributes.placeholder, 'Rechercher ici');
    assert.equal(child.attributes.title, 'Rechercher');
    assert.equal(child.attributes['aria-label'], 'Champ de recherche');

    console.log('i18n: 24 assertions passed');
  } finally {
    restoreGlobals();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
