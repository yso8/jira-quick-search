# Task 4 brief

Finish the approved i18n work with concise documentation and complete verification.

Requirements:
- Update README briefly to state that Jira Quick Search is available in English and Français; do not add an architecture essay.
- Run `scripts/validate-extension.ps1`, `scripts/test-extension.ps1`, every Node test under `tests/` (including i18n and Task 3 tests), and `tests/package-extension.test.ps1`.
- Inspect the package output/contract for both `_locales` trees, valid Manifest V3, local references, and no development files.
- Run `git diff --check` and scan for remaining hardcoded visible French strings in HTML/JS that should be translated, without changing Jira/user data, identifiers, logs, or comments.
- If verification or scan finds a real gap, fix it and rerun affected checks. Preserve all existing behavior and permissions.
- Commit Task 4 if possible; if Git permission fails, report it. Do not spawn other agents.
