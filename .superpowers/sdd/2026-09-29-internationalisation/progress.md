# SDD ledger — plan: docs/superpowers/plans/2026-09-29-internationalisation.md

## Preflight scan

| Scope | Relationship checked | Result / ruling |
|---|---|---|
| Task 1 ↔ Task 2 | Task 2 consumes `i18n.js` and locale JSON from Task 1; Task 1 does not touch manifest/package files. | No conflict. |
| Task 1 ↔ Task 3 | Task 3 consumes `t()` and active locale state from Task 1; no shared write files. | No conflict. |
| Task 1 ↔ Task 4 | Task 4 verifies catalogs and documentation; no implementation overlap. | No conflict. |
| Task 2 ↔ Task 3 | Both touch HTML bootstrap files only conceptually; Task 2 adds script ordering and Task 3 migrates strings/settings. | Sequential ordering is required and specified. |
| Task 2 ↔ Task 4 | Task 4 runs packaging/validation after Task 2 changes and updates README. | No conflict. |
| Task 3 ↔ Task 4 | Task 4 verifies and documents Task 3 behavior. | No conflict. |
| Task 1 | Tests specify interfaces produced by the task; created files match later consumers. | Consistent. |
| Task 2 | Structural tests and package files match produced manifest/bootstrap behavior. | Consistent. |
| Task 3 | Tests and touched files match preference/UI migration scope. | Consistent. |
| Task 4 | Verification and README changes are self-contained. | Consistent. |

No plan conflicts or rubric conflicts found. Implementation is serial because Tasks 2–3 consume Task 1 interfaces and share HTML bootstrap surfaces.

Task 1: fix round 1/5 (4 addressed, 0 open; no commit because Git index lock permission denied)
Task 1: complete (current worktree changes, review clean)
Task 2: minor (deferred): service-worker translation promise may retain locale until worker restart; page settings changes reload the view and the worker lifecycle remains valid.
Task 2: complete (commits dc5fa1e, review clean)
Task 3: fix round 1/5 (3 addressed, 0 open; commit f9921ba)
Task 3: complete (commits f9921ba, review clean)
Task 4: complete (commit 05ac4c1, verification clean)
Final review: fix round 1/1 (3 addressed, 0 open; commits e8e135b, 33904ee, 12d1418)
Final review: complete (scoped re-reviews clean; fresh full verification passed)

## Task 1 — fix round 1

- Corrected Chrome `$$` escaping and made substitution a single-pass operation so inserted values are not processed again.
- `applyTranslations()` now translates the supplied element and its descendants.
- Expanded `tests/i18n.test.js` to isolate module state, check actual `runtime.getURL()` fetch URLs and English fallback, verify absent preference and reset-to-auto storage behavior, and restore mocked globals.
- Verification: `node tests/i18n.test.js` passes (24 assertions).

Task 2: Ruling: static text attributes remain with Task 3 — the Task 2 brief requires script ordering while Task 3 owns the UI migration — cost if wrong: an additional HTML edit in Task 3.
Task 2: Ruling: corrected Task 1 service storage from local to sync — required by the approved preference contract and worker localization — cost if wrong: a preference stored only in local storage would no longer be read.
Task 2: complete (commit dc5fa1e; all 16 Node tests, scripts/test-extension.ps1, scripts/validate-extension.ps1, tests/package-extension.test.ps1, and git diff --check passed).
