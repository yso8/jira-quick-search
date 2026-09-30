# Task 2 brief

Integrate the Task 1 i18n service into the Manifest V3 manifest, package validation, all HTML entry points, and the service worker.

Requirements:
- Set `default_locale` to `en` in `manifest.json`.
- Use `__MSG_*__` tokens for localized manifest name, description, action title, and command description.
- Ensure `_locales/en/messages.json` and `_locales/fr/messages.json` are included at the ZIP root and validated by `scripts/package-extension.ps1` and `scripts/validate-extension.ps1`.
- Add `src/services/i18n/i18n.js` to `onboarding.html`, `options.html`, `popup.html`, `search.html`, `workspace.html`, and `recap.html` before dependent page scripts.
- Update `background.js` to import/load the i18n service while registering Chrome command and omnibox listeners synchronously at top-level. Translation loading may happen lazily inside callbacks or via cached lazy initialization; no listener registration may wait on async initialization.
- Localize omnibox suggestion text through `t()` once the lazy translation promise is available.
- Add/update structural tests and package contract assertions for these requirements. Preserve existing permissions and behavior.
- Run affected tests and `tests/package-extension.test.ps1`; report results. Do not spawn other agents. Commit if possible, but Git index locking may fail in this environment.
