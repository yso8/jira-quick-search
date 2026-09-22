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
  const method = options.method || 'GET';
  await debugLog('requête Jira', { method, path });
  const response = await fetch(`${config.jiraUrl}${path}`, {
    ...options,
    headers: { ...jiraHeaders(config.jiraEmail, config.jiraToken), ...(options.headers || {}) }
  });
  const responseText = response.ok ? '' : await response.text();
  await debugLog('réponse Jira', { method, path, status: response.status, details: responseText });
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'Accès Jira refusé. Vérifiez votre email, votre token et vos permissions.'
      : response.status === 429
        ? 'Jira limite temporairement les requêtes. Réessayez dans quelques instants.'
        : `Jira a répondu avec le statut ${response.status}.`;
    throw new Error(responseText ? `${message} ${responseText}` : message);
  }
  return response;
}

async function fetchFilterMetadata(config) {
  const sources = [
    { key: 'projects', path: `/rest/api/${JIRA_API_VERSION}/project/search?maxResults=100&status=live` },
    { key: 'users', path: `/rest/api/${JIRA_API_VERSION}/users/search?maxResults=100` },
    { key: 'issueTypes', path: `/rest/api/${JIRA_API_VERSION}/issuetype` },
    { key: 'statuses', path: `/rest/api/${JIRA_API_VERSION}/status` },
    { key: 'priorities', path: `/rest/api/${JIRA_API_VERSION}/priority` },
    { key: 'fields', path: `/rest/api/${JIRA_API_VERSION}/field` }
  ];

  const loadedSources = await Promise.all(sources.map(async source => {
    try {
      const response = await jiraRequest(config, source.path);
      return [source.key, await response.json()];
    } catch (error) {
      await debugLog('métadonnée de filtre indisponible', { source: source.key, message: error.message });
      return [source.key, []];
    }
  }));
  const metadata = Object.fromEntries(loadedSources);
  const projects = metadata.projects;
  const users = metadata.users;
  const issueTypes = metadata.issueTypes;
  const statuses = metadata.statuses;
  const priorities = metadata.priorities;
  const fields = metadata.fields;

  const filters = [
    { id: 'project', name: 'Espace', jqlField: 'project', options: (projects.values || projects).map(project => ({ value: project.key, label: project.name })) },
    { id: 'assignee', name: 'Personne assignée', jqlField: 'assignee', options: users.filter(user => user.active && user.accountType === 'atlassian').sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')).map(user => ({ value: user.accountId, label: user.displayName })) },
    { id: 'issuetype', name: 'Type', jqlField: 'issuetype', options: issueTypes.map(type => ({ value: type.name, label: type.name })) },
    { id: 'status', name: 'État', jqlField: 'status', options: statuses.map(status => ({ value: status.name, label: status.name })) },
    { id: 'priority', name: 'Priorité', jqlField: 'priority', options: priorities.map(priority => ({ value: priority.name, label: priority.name })) }
  ];

  const customFields = await loadCustomSelectFilters(config, fields);
  return filters.concat(customFields);
}

async function loadCustomSelectFilters(config, fields) {
  const selectableFields = fields.filter(field => field.id.startsWith('customfield_') && field.schema && (
    field.schema.type === 'option' || field.schema.type === 'array'
  ));

  const loaded = await Promise.all(selectableFields.map(async field => {
    try {
      const contextsResponse = await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/field/${encodeURIComponent(field.id)}/context?maxResults=50`);
      const contexts = await contextsResponse.json();
      const context = contexts.values && contexts.values[0];
      if (!context) return null;

      const optionsResponse = await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/field/${encodeURIComponent(field.id)}/context/${context.id}/option?maxResults=100`);
      const options = await optionsResponse.json();
      const values = (options.values || []).filter(option => option.disabled !== true);
      if (!values.length) return null;

      const isProductField = String(field.name || '').trim().toLocaleLowerCase('fr-FR') === 'produit';

      return {
        id: field.id,
        name: isProductField ? 'Produit' : field.name,
        jqlField: field.id,
        options: values.map(option => ({ value: option.value, label: option.value }))
      };
    } catch {
      return null;
    }
  }));

  return loaded.filter(Boolean);
}
