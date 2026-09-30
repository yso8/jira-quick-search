const fs = require('node:fs');
const i18n = require('../src/services/i18n/i18n.js');
const en = JSON.parse(fs.readFileSync('_locales/en/messages.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('_locales/fr/messages.json', 'utf8'));

global.JiraQuickSearchI18n = i18n;
// Explicit catalogs initialize synchronously, before the returned promise settles.
i18n.initI18n({ preference: 'fr', uiLanguage: 'fr-FR', catalogs: { en, fr } });

module.exports = { i18n, en, fr };
