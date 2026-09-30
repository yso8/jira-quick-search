const FEEDBACK_ISSUE_URL = 'https://github.com/yso8/jira-quick-search/issues/new';
const FEEDBACK_TYPES = new Set(['bug', 'feature', 'question']);
var t = (...args) => JiraQuickSearchI18n.t(...args);

function validateFeedback({ type, title, description } = {}) {
  if (!FEEDBACK_TYPES.has(type)) return { valid: false, message: t('ui_select_a_feedback_type') };
  if (!String(title || '').trim()) return { valid: false, message: t('ui_add_a_title_to_your_feedback') };
  if (!String(description || '').trim()) return { valid: false, message: t('ui_briefly_describe_the_issue_before_continuing') };
  return { valid: true };
}

function buildTechnicalInfo({ version, browser, platform, manifestVersion, instanceType, diagnosticStatus } = {}) {
  return [
    t('feedbackVersion', version || t('ui_unknown')),
    t('feedbackBrowser', browser || t('ui_unknown_201')),
    t('feedbackSystem', platform || t('ui_unknown_201')),
    t('feedbackManifest', manifestVersion || t('ui_unknown')),
    t('feedbackInstance', instanceType || t('ui_undetermined')),
    t('feedbackDiagnostic', diagnosticStatus || t('ui_not_run'))
  ].join('\n');
}

function buildFeedbackBody({ type, description, reproducible = false, includeTechnical = false, technicalInfo = '' } = {}) {
  let body;
  if (type === 'bug') {
    body = t('feedbackBug', description.trim());
    body += `\n\n${t('feedbackReproducible', reproducible ? t('ui_yes') : t('ui_not_specified'))}`;
  } else if (type === 'feature') {
    body = t('feedbackFeature', description.trim());
  } else {
    body = t('feedbackQuestion', description.trim());
  }

  if (includeTechnical && technicalInfo) body += `\n\n${t('feedbackTechnical', technicalInfo)}`;
  return body;
}

function buildGithubIssueUrl({ type, title, body }) {
  const url = new URL(FEEDBACK_ISSUE_URL);
  url.searchParams.set('title', title.trim());
  url.searchParams.set('body', body);
  return url.toString();
}

if (typeof module !== 'undefined') {
  module.exports = { FEEDBACK_ISSUE_URL, validateFeedback, buildTechnicalInfo, buildFeedbackBody, buildGithubIssueUrl };
}
