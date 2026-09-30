(function (root) {
  const STORAGE_KEY = 'language';
  const catalogs = { en: null, fr: null };
  let activeLanguage = 'en';

  function resolveLanguage(preference, uiLanguage) {
    if (preference === 'en' || preference === 'fr') return preference;
    return String(uiLanguage || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  async function getLanguagePreference() {
    const result = await root.chrome.storage.sync.get(STORAGE_KEY);
    return result[STORAGE_KEY] === 'en' || result[STORAGE_KEY] === 'fr' ? result[STORAGE_KEY] : 'auto';
  }

  async function setLanguagePreference(value) {
    if (!['auto', 'en', 'fr'].includes(value)) throw new TypeError('La langue doit être auto, en ou fr.');
    if (value === 'auto') {
      if (root.chrome.storage.sync.remove) await root.chrome.storage.sync.remove(STORAGE_KEY);
      else await root.chrome.storage.sync.set({ [STORAGE_KEY]: 'auto' });
      return;
    }
    await root.chrome.storage.sync.set({ [STORAGE_KEY]: value });
  }

  function normalizeSubstitutions(substitutions) {
    if (substitutions === undefined || substitutions === null) return [];
    return (Array.isArray(substitutions) ? substitutions : [substitutions]).map(value => String(value));
  }

  function findMessage(key) {
    for (const locale of [activeLanguage, 'en']) {
      const entry = catalogs[locale] && catalogs[locale][key];
      if (entry !== undefined) return entry;
    }
    return undefined;
  }

  function t(key, substitutions) {
    const entry = findMessage(key);
    if (entry === undefined) return key;
    const values = normalizeSubstitutions(substitutions);
    let message = typeof entry === 'string' ? entry : entry.message;
    if (typeof message !== 'string') return key;
    const placeholders = typeof entry === 'object' && entry.placeholders ? entry.placeholders : {};
    return message.replace(/\$\$|\$([1-9]\d*)|\$([a-z][a-z0-9_]*)\$/gi, (token, index, name) => {
      if (token === '$$') return '$';
      if (index) return values[Number(index) - 1] ?? '';
      const placeholder = placeholders[name] || placeholders[name.toLowerCase()];
      if (placeholder === undefined) return token;
      const content = typeof placeholder === 'string' ? placeholder : placeholder.content;
      return String(content || '').replace(/\$\$|\$([1-9]\d*)/g, (part, placeholderIndex) =>
        part === '$$' ? '$' : values[Number(placeholderIndex) - 1] ?? ''
      );
    });
  }

  function getDateLocale() {
    return activeLanguage === 'fr' ? 'fr-FR' : 'en-US';
  }

  async function initI18n(options = {}) {
    let preference = options.preference;
    if (preference === undefined) preference = await getLanguagePreference();
    const uiLanguage = options.uiLanguage === undefined ? root.chrome.i18n.getUILanguage() : options.uiLanguage;
    activeLanguage = resolveLanguage(preference, uiLanguage);
    if (options.catalogs) {
      catalogs.en = options.catalogs.en || null;
      catalogs.fr = options.catalogs.fr || null;
    } else {
      const response = await root.fetch(root.chrome.runtime.getURL(`_locales/${activeLanguage}/messages.json`));
      if (!response.ok) throw new Error(`Impossible de charger le catalogue ${activeLanguage}.`);
      catalogs[activeLanguage] = await response.json();
      if (activeLanguage !== 'en' && !catalogs.en) {
        const fallback = await root.fetch(root.chrome.runtime.getURL('_locales/en/messages.json'));
        if (fallback.ok) catalogs.en = await fallback.json();
      }
    }
    return activeLanguage;
  }

  function applyTranslations(target) {
    if (!target || typeof target.querySelectorAll !== 'function') return;
    const elements = target.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]');
    const translateElement = element => {
      const data = element.dataset || {};
      if (data.i18n) element.textContent = t(data.i18n);
      if (data.i18nPlaceholder) element.setAttribute('placeholder', t(data.i18nPlaceholder));
      if (data.i18nTitle) element.setAttribute('title', t(data.i18nTitle));
      if (data.i18nAriaLabel) element.setAttribute('aria-label', t(data.i18nAriaLabel));
    };
    if (target.dataset) translateElement(target);
    for (const element of elements) translateElement(element);
  }

  const api = { resolveLanguage, t, getDateLocale, getLanguagePreference, setLanguagePreference, initI18n, applyTranslations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JiraQuickSearchI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
