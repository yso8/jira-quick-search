# Task 1 brief

Implement the translation catalog and runtime i18n service for the Jira Quick Search extension.

Requirements:
- Create `_locales/en/messages.json` and `_locales/fr/messages.json` as the sole source of translations.
- Create `src/services/i18n/i18n.js` exposing `resolveLanguage(preference, uiLanguage)`, `t(key, substitutions)`, `getLanguagePreference()`, `setLanguagePreference(value)`, `initI18n()`, and `applyTranslations(root)`.
- Load packaged JSON through `chrome.runtime.getURL('_locales/<locale>/messages.json')`.
- Missing language preference means `auto`; do not write `language: "auto"` automatically.
- Auto uses the supplied Chrome UI language: every locale beginning with `fr` resolves to `fr`; everything else resolves to `en`. Explicit `en`/`fr` wins.
- Fallback is active locale, then English, then the key itself.
- Support Chrome-style message objects and substitutions/placeholders.
- Support `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`, and `data-i18n-aria-label`.
- Add `tests/i18n.test.js` covering all required locale, fallback, substitution, storage, JSON loading, and DOM behavior.
- Keep the implementation vanilla, dependency-free, and testable with mocked Chrome APIs/fetch.

Run `node tests/i18n.test.js` and report the result. Do not modify unrelated application files. Do not spawn other agents. Commit the task changes if possible; if Git permission prevents it, report that clearly.
