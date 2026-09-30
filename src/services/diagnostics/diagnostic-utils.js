const DIAGNOSTIC_API_VERSION = '3';
var t = (...args) => JiraQuickSearchI18n.t(...args);

function validateDiagnosticUrl(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!normalized) return { status: 'error', message: t('ui_jira_url_is_missing') };

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') {
      return { status: 'error', message: t('ui_the_jira_url_must_use_https') };
    }
    if (!/^[a-z0-9-]+\.atlassian\.net$/i.test(url.hostname) || url.pathname !== '/') {
      return { status: 'error', message: t('ui_the_url_must_point_to_a_jira_cloud_atlassian_net_instan') };
    }
    return { status: 'success', message: t('configuredInstance', normalized) };
  } catch {
    return { status: 'error', message: t('ui_the_jira_url_is_invalid') };
  }
}

function classifyDiagnosticError(error) {
  const status = error && error.status;
  if (status === 401) return { kind: 'authentication', status: 'error', message: t('ui_jira_authentication_failed_check_your_token_or_generate'), action: t('ui_check_the_email_and_api_token') };
  if (status === 403) return { kind: 'permission', status: 'warning', message: t('ui_the_connection_works_but_the_extension_cannot_access_so'), action: t('ui_check_your_jira_account_permissions') };
  if (status === 404) return { kind: 'api', status: 'error', message: t('ui_the_expected_jira_api_is_unavailable_for_this_instance'), action: t('ui_check_the_url_and_jira_availability') };
  if (error instanceof TypeError || error?.name === 'AbortError' || !status) return { kind: 'network', status: 'error', message: t('ui_could_not_reach_this_jira_instance_check_the_url_or_you'), action: t('ui_check_the_network_connection_and_try_again') };
  return { kind: 'unexpected', status: 'error', message: t('ui_jira_returned_an_unexpected_response'), action: t('ui_try_again_or_view_the_technical_details') };
}

async function runConnectionDiagnostics(config, dependencies = {}) {
  const request = dependencies.request || jiraRequest;
  const checks = [];
  const urlCheck = validateDiagnosticUrl(config?.jiraUrl);
  checks.push({ id: 'url', label: 'URL Jira', ...urlCheck });
  if (urlCheck.status === 'error') return { overall: 'error', checks };
  if (!config?.jiraEmail || !config?.jiraToken) {
    checks.push({ id: 'authentication', label: t('ui_authentication'), status: 'error', message: t('ui_the_token_or_email_is_missing'), action: t('ui_enter_your_jira_credentials') });
    return { overall: 'error', checks };
  }

  try {
    const response = await request(config, `/rest/api/${DIAGNOSTIC_API_VERSION}/myself`, { method: 'GET' });
    if (!response?.ok) throw Object.assign(new Error('Jira authentication failed'), { status: response?.status });
    checks.push({ id: 'instance', label: t('ui_jira_connection_191'), status: 'success', message: t('ui_the_instance_responded_successfully') });
    checks.push({ id: 'authentication', label: t('ui_authentication'), status: 'success', message: t('ui_the_jira_credentials_are_valid') });
  } catch (error) {
    const result = classifyDiagnosticError(error);
    checks.push({ id: result.kind === 'network' ? 'instance' : 'authentication', label: result.kind === 'network' ? t('ui_jira_connection_191') : t('ui_authentication'), ...result });
    return { overall: 'error', checks };
  }

  try {
    const response = await request(config, `/rest/api/${DIAGNOSTIC_API_VERSION}/search/jql`, {
      method: 'POST',
      body: JSON.stringify({ jql: 'ORDER BY updated DESC', maxResults: 1, fields: ['key'] })
    });
    if (!response?.ok) throw Object.assign(new Error('Jira search failed'), { status: response?.status });
    checks.push({ id: 'search', label: t('ui_issue_search'), status: 'success', message: t('ui_issue_search_is_available') });
  } catch (error) {
    const result = classifyDiagnosticError(error);
    checks.push({ id: 'search', label: t('ui_permissions'), ...result });
  }

  return { overall: checks.some(check => check.status === 'error') ? 'error' : checks.some(check => check.status === 'warning') ? 'warning' : 'success', checks };
}

function createTechnicalDetails(result) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    overall: result.overall,
    checks: result.checks.map(({ id, label, status, kind }) => ({ id, label, status, ...(kind ? { kind } : {}) }))
  }, null, 2);
}

async function clearExtensionData(storage = chrome.storage) {
  await Promise.all([storage.sync.clear(), storage.local.clear()]);
}

if (typeof module !== 'undefined') {
  module.exports = { validateDiagnosticUrl, classifyDiagnosticError, runConnectionDiagnostics, createTechnicalDetails, clearExtensionData };
}
