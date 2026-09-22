const DIAGNOSTIC_API_VERSION = '3';

function validateDiagnosticUrl(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!normalized) return { status: 'error', message: 'URL Jira absente.' };

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') {
      return { status: 'error', message: 'L’URL Jira doit utiliser HTTPS.' };
    }
    if (!/^[a-z0-9-]+\.atlassian\.net$/i.test(url.hostname) || url.pathname !== '/') {
      return { status: 'error', message: 'L’URL doit pointer vers une instance Jira Cloud atlassian.net.' };
    }
    return { status: 'success', message: `L’instance configurée est ${normalized}` };
  } catch {
    return { status: 'error', message: 'L’URL Jira n’est pas valide.' };
  }
}

function classifyDiagnosticError(error) {
  const status = error && error.status;
  if (status === 401) return { kind: 'authentication', status: 'error', message: 'L’authentification Jira a échoué. Vérifiez votre token ou générez-en un nouveau.', action: 'Vérifier l’email et le token API.' };
  if (status === 403) return { kind: 'permission', status: 'warning', message: 'La connexion fonctionne, mais l’extension n’a pas accès à certaines données nécessaires.', action: 'Vérifier les permissions du compte Jira.' };
  if (status === 404) return { kind: 'api', status: 'error', message: 'L’API Jira attendue est indisponible pour cette instance.', action: 'Vérifier l’URL et la disponibilité de Jira.' };
  if (error instanceof TypeError || error?.name === 'AbortError' || !status) return { kind: 'network', status: 'error', message: 'Impossible de joindre cette instance Jira. Vérifiez l’URL ou votre connexion réseau.', action: 'Vérifier la connexion réseau et réessayer.' };
  return { kind: 'unexpected', status: 'error', message: 'La réponse de Jira est inattendue.', action: 'Réessayer ou consulter les détails techniques.' };
}

async function runConnectionDiagnostics(config, dependencies = {}) {
  const request = dependencies.request || jiraRequest;
  const checks = [];
  const urlCheck = validateDiagnosticUrl(config?.jiraUrl);
  checks.push({ id: 'url', label: 'URL Jira', ...urlCheck });
  if (urlCheck.status === 'error') return { overall: 'error', checks };
  if (!config?.jiraEmail || !config?.jiraToken) {
    checks.push({ id: 'authentication', label: 'Authentification', status: 'error', message: 'Le token ou l’adresse email est absent.', action: 'Renseigner les identifiants Jira.' });
    return { overall: 'error', checks };
  }

  try {
    const response = await request(config, `/rest/api/${DIAGNOSTIC_API_VERSION}/myself`, { method: 'GET' });
    if (!response?.ok) throw Object.assign(new Error('Jira authentication failed'), { status: response?.status });
    checks.push({ id: 'instance', label: 'Connexion à Jira', status: 'success', message: 'L’instance répond correctement.' });
    checks.push({ id: 'authentication', label: 'Authentification', status: 'success', message: 'Les identifiants Jira sont valides.' });
  } catch (error) {
    const result = classifyDiagnosticError(error);
    checks.push({ id: result.kind === 'network' ? 'instance' : 'authentication', label: result.kind === 'network' ? 'Connexion à Jira' : 'Authentification', ...result });
    return { overall: 'error', checks };
  }

  try {
    const response = await request(config, `/rest/api/${DIAGNOSTIC_API_VERSION}/search/jql`, {
      method: 'POST',
      body: JSON.stringify({ jql: 'ORDER BY updated DESC', maxResults: 1, fields: ['key'] })
    });
    if (!response?.ok) throw Object.assign(new Error('Jira search failed'), { status: response?.status });
    checks.push({ id: 'search', label: 'Recherche de tickets', status: 'success', message: 'La recherche de tickets est disponible.' });
  } catch (error) {
    const result = classifyDiagnosticError(error);
    checks.push({ id: 'search', label: 'Permissions', ...result });
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
