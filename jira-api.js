const JIRA_API_VERSION = '3';
const JIRA_CONFIG_KEYS = ['jiraUrl', 'jiraEmail', 'jiraToken'];

async function loadJiraConfig() {
  const config = await chrome.storage.sync.get(JIRA_CONFIG_KEYS);
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    throw new Error('Configuration Jira incomplète. Ouvrez les options de l’extension.');
  }
  return {
    jiraUrl: normalizeJiraUrl(config.jiraUrl),
    jiraEmail: config.jiraEmail,
    jiraToken: config.jiraToken
  };
}

function normalizeJiraUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isValidJiraUrl(value) {
  try {
    const url = new URL(normalizeJiraUrl(value));
    return url.protocol === 'https:' && /^[a-z0-9-]+\.atlassian\.net$/i.test(url.hostname) && !url.pathname.replace(/\/+$/, '');
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function jiraHeaders(email, token) {
  return {
    Authorization: `Basic ${btoa(`${email}:${token}`)}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
}

async function jiraRequest(config, path, options = {}) {
  const response = await fetch(`${config.jiraUrl}${path}`, {
    ...options,
    headers: { ...jiraHeaders(config.jiraEmail, config.jiraToken), ...(options.headers || {}) }
  });
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'Accès Jira refusé. Vérifiez votre email, votre token et vos permissions.'
      : response.status === 429
        ? 'Jira limite temporairement les requêtes. Réessayez dans quelques instants.'
        : `Jira a répondu avec le statut ${response.status}.`;
    throw new Error(message);
  }
  return response;
}
