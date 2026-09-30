const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { bindLanguageControl } = require('../src/pages/settings/language-control.js');
const i18n = require('../src/services/i18n/i18n.js');
const { generateMarkdownReport } = require('../src/utils/reports/report-utils.js');

async function main() {
  const writes = [];
  let preference;
  global.chrome = {
    storage: { sync: {
      get: async key => { assert.equal(key, 'language'); return preference === undefined ? {} : { language: preference }; },
      set: async value => { writes.push(value); preference = value.language; },
      remove: async key => { writes.push({ removed: key }); preference = undefined; }
    } },
    i18n: { getUILanguage: () => 'fr-CA' }
  };
  const select = { value: '', addEventListener(type, handler) { assert.equal(type, 'change'); this.onChange = handler; } };
  const location = { reloads: 0, reload() { this.reloads += 1; } };
  await bindLanguageControl(select, i18n, location);
  assert.equal(select.value, 'auto');
  assert.deepEqual(writes, []);
  select.value = 'en';
  await select.onChange();
  assert.deepEqual(writes, [{ language: 'en' }]);
  assert.equal(location.reloads, 1);
  select.value = 'auto';
  await select.onChange();
  assert.deepEqual(writes[1], { removed: 'language' });
  assert.equal(location.reloads, 2);

  const html = fs.readFileSync('options.html', 'utf8');
  assert.match(html, /<select[^>]*id="language"[^>]*>/);
  for (const value of ['auto', 'en', 'fr']) assert.match(html, new RegExp(`<option value="${value}"`));
  const en = JSON.parse(fs.readFileSync('_locales/en/messages.json', 'utf8'));
  const fr = JSON.parse(fs.readFileSync('_locales/fr/messages.json', 'utf8'));
  for (const [catalog, label, automatic] of [[en, 'Language', 'Auto (browser language)'], [fr, 'Langue', 'Automatique (langue du navigateur)']]) {
    assert.equal(catalog.languageLabel.message, label);
    assert.equal(catalog.languageAuto.message, automatic);
    assert.equal(catalog.languageEnglish.message, 'English');
    assert.equal(catalog.languageFrench.message, 'Français');
  }
  const staticPageMarkers = {
    options: [/<title\b[^>]*data-i18n="ui_jira_quick_search_connection"/, /<h2\b[^>]*data-i18n="ui_privacy_and_local_data"/, /<input\b[^>]*data-i18n-placeholder="ui_https_your_company_atlassian_net"/],
    onboarding: [/<h1\b[^>]*id="onboarding-title"[^>]*data-i18n="ui_welcome_to_jira_quick_search"/, /<input\b[^>]*id="onboardingJiraToken"[^>]*data-i18n-placeholder="ui_paste_your_api_token"/],
    popup: [/<p\b[^>]*data-i18n="ui_search_for_an_issue_or_text"/, /<input\b[^>]*data-i18n-placeholder="ui_proj_123_or_october_invoice"/],
    search: [/<title\b[^>]*data-i18n="ui_jira_search"/, /<input\b[^>]*data-i18n-placeholder="ui_search_for_an_issue"/, /<div\b[^>]*id="filterBar"[^>]*data-i18n-aria-label="ui_jira_filters"/],
    workspace: [/<h1\b[^>]*data-i18n="ui_workspace"/, /<p\b[^>]*data-i18n="ui_quickly_find_your_important_issues_and_searches"/, /<div\b[^>]*id="recentHeading"[^>]*data-i18n-aria-label="ui_recent_issues"/],
    recap: [/<title\b[^>]*data-i18n="ui_weekly_summary_jira"/, /<span\b[^>]*data-i18n="ui_generate_summary"/]
  };
  for (const [page, markers] of Object.entries(staticPageMarkers)) {
    const markup = fs.readFileSync(`${page}.html`, 'utf8');
    for (const marker of markers) assert.match(markup, marker, `${page}.html: missing static translation marker ${marker}`);
  }
  const sources = [
    ...['options', 'onboarding', 'popup', 'search', 'workspace', 'recap'].map(page => `${page}.html`),
    'src/components/navigation/navbar.js', 'src/pages/settings/options.js', 'src/pages/onboarding/onboarding.js',
    'src/pages/popup/popup.js', 'src/pages/search/search.js', 'src/pages/workspace/workspace.js',
    'src/pages/recap/recap.js', 'src/services/jira/jira-api.js', 'src/services/diagnostics/diagnostic-utils.js',
    'src/utils/feedback/feedback-utils.js', 'src/utils/reports/report-utils.js'
  ];
  for (const source of sources) {
    const content = fs.readFileSync(source, 'utf8');
    const keys = [
      ...[...content.matchAll(/data-i18n(?:-placeholder|-title|-aria-label)?="([\w]+)"/g)].map(match => match[1]),
      ...[...content.matchAll(/\bt\('([\w]+)'/g)].map(match => match[1])
    ];
    for (const key of keys) {
      assert.ok(en[key]?.message, `${source}: English catalog lacks ${key}`);
      assert.ok(fr[key]?.message, `${source}: French catalog lacks ${key}`);
    }
  }
  const examples = [
    ['languageLabel', 'Language', 'Langue'],
    ['ui_welcome_to_jira_quick_search', 'Welcome to Jira Quick Search', 'Bienvenue sur Jira Quick Search'],
    ['ui_search_for_an_issue_or_text', 'Search for an issue or text', 'Rechercher un ticket ou du texte'],
    ['ui_jira_search', 'Jira search', 'Recherche Jira'],
    ['ui_workspace', 'Workspace', 'Espace de travail'],
    ['ui_weekly_summary_jira', 'Weekly summary - Jira', 'Récapitulatif Hebdomadaire - Jira'],
    ['ui_issue_not_found_check_the_jira_key', 'Issue not found. Check the Jira key.', 'Ticket introuvable. Vérifiez la clé Jira.'],
    ['ui_no_results_found', 'No results found', 'Aucun résultat trouvé'],
    ['ui_no_pinned_issues', 'No pinned issues', 'Aucun ticket épinglé'],
    ['ui_generate_summary', 'Generate summary', 'Générer le récap'],
    ['ui_welcome', 'Welcome', 'Bienvenue'],
    ['ui_privacy_and_local_data', 'Privacy and local data', 'Confidentialité et données locales'],
    ['ui_jira_url_is_missing', 'Jira URL is missing.', 'URL Jira absente.'],
    ['ui_jira_access_denied_check_your_email_token_and_permissio', 'Jira access denied. Check your email, token, and permissions.', 'Accès Jira refusé. Vérifiez votre email, votre token et vos permissions.'],
    ['ui_select_a_feedback_type', 'Select a feedback type.', 'Sélectionnez un type de feedback.']
  ];
  const staticAttributes = [
    ['search', /<input\b[^>]*data-i18n-placeholder="([\w]+)"[^>]*>/, 'i18nPlaceholder', 'placeholder', 'Search for an issue...', 'Rechercher un ticket...'],
    ['search', /<button\b[^>]*id="saveSearchBtn"[^>]*data-i18n-title="([\w]+)"[^>]*>/, 'i18nTitle', 'title', 'Save this search', 'Sauvegarder cette recherche'],
    ['workspace', /<div\b[^>]*id="recentHeading"[^>]*data-i18n-aria-label="([\w]+)"[^>]*>/, 'i18nAriaLabel', 'aria-label', 'Recent issues', 'Tickets récents']
  ];
  global.JiraQuickSearchI18n = i18n;
  const { validateDiagnosticUrl } = require('../src/services/diagnostics/diagnostic-utils.js');
  const { validateFeedback } = require('../src/utils/feedback/feedback-utils.js');
  const jiraIssue = { key: 'PROJ-42', summary: 'Client-provided summary', status: 'In Review', project: 'Client project', updated: '2026-09-18T10:00:00Z' };
  const report = { all: [jiraIssue], involved: [jiraIssue], completed: [], inProgress: [jiraIssue], created: [], updated: [jiraIssue] };
  for (const [language, index] of [['en', 1], ['fr', 2]]) {
    await i18n.initI18n({ preference: language, uiLanguage: 'de-DE', catalogs: { en, fr } });
    for (const [key, english, french] of examples) assert.equal(i18n.t(key), index === 1 ? english : french);
    for (const [page, tagPattern, datasetName, attributeName, english, french] of staticAttributes) {
      const tag = fs.readFileSync(`${page}.html`, 'utf8').match(tagPattern);
      assert.ok(tag, `${page}.html: missing ${attributeName} translation marker`);
      const attributes = {};
      const element = { dataset: { [datasetName]: tag[1] }, setAttribute(name, value) { attributes[name] = value; } };
      i18n.applyTranslations({ querySelectorAll: () => [element] });
      assert.equal(attributes[attributeName], index === 1 ? english : french);
    }
    assert.equal(validateDiagnosticUrl('').message, index === 1 ? 'Jira URL is missing.' : 'URL Jira absente.');
    assert.equal(validateFeedback({}).message, index === 1 ? 'Select a feedback type.' : 'Sélectionnez un type de feedback.');
    assert.equal(i18n.getDateLocale(), language === 'fr' ? 'fr-FR' : 'en-US');
    const markdown = generateMarkdownReport(report, new Date('2026-09-16'), new Date('2026-09-22'));
    assert.match(markdown, language === 'fr' ? /^## Chronologie$/m : /^## Timeline$/m);
    assert.match(markdown, /PROJ-42 — Client-provided summary \(In Review\)/);
    if (language === 'en') {
      assert.match(i18n.t('workspaceSummary', [1, 2, 3]), /^Recent: 1 · Pinned: 2 · Saved searches: 3$/);
      assert.equal(i18n.t('reportFirst', ['Period:', 2, 'activity']), 'Period: Number of issues matching activity: 2.');
      assert.equal(i18n.t('reportCompleted', 2), 'Completed issues: 2.');
      assert.match(markdown, /- Included issues: 1/);
      assert.doesNotMatch(markdown, /issue\(s\)|search\(es\)/);
    } else {
      assert.equal(i18n.t('workspaceSummary', [1, 2, 3]), '1 ticket(s) récent(s) · 2 ticket(s) épinglé(s) · 3 recherche(s) sauvegardée(s)');
    }
  }
  await i18n.initI18n({ preference: 'en', uiLanguage: 'en-US', catalogs: { en, fr } });
  for (const page of ['search', 'recap']) {
    const elements = new Map();
    let onReady;
    const document = {
      documentElement: { lang: '' },
      addEventListener(event, callback) { if (event === 'DOMContentLoaded') onReady = callback; },
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { style: {}, addEventListener() {} });
        return elements.get(id);
      },
      querySelectorAll() { return []; }
    };
    const context = {
      document,
      window: { location: { search: '' } },
      URLSearchParams,
      JiraQuickSearchI18n: { ...i18n, initI18n: async () => 'en', applyTranslations() {} },
      chrome: { storage: { sync: { get: async () => ({}) } } }
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('src/services/jira/jira-api.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync(`src/pages/${page}/${page}.js`, 'utf8'), context);
    await onReady();
    assert.match(elements.get('errorMessage').innerHTML, /Configuration missing/);
    assert.match(elements.get('errorMessage').innerHTML, /Configure the extension/);
  }
  console.log('task-3-i18n: language persistence and page catalog contract passed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
