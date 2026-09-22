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

async function fetchFilterMetadata(config) {
  const [projectsResponse, usersResponse, issueTypesResponse, statusesResponse, prioritiesResponse, fieldsResponse] = await Promise.all([
    jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/project/search?maxResults=100&status=live`),
    jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/users/search?maxResults=100`),
    jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/issuetype`),
    jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/status`),
    jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/priority`),
    jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/field`)
  ]);

  const [projects, users, issueTypes, statuses, priorities, fields] = await Promise.all([
    projectsResponse.json(), usersResponse.json(), issueTypesResponse.json(),
    statusesResponse.json(), prioritiesResponse.json(), fieldsResponse.json()
  ]);

  const filters = [
    { id: 'project', name: 'Espace', jqlField: 'project', options: (projects.values || projects).map(project => ({ value: project.key, label: project.name })) },
    { id: 'assignee', name: 'Personne assignée', jqlField: 'assignee', options: users.filter(user => user.active).map(user => ({ value: user.accountId, label: user.displayName })) },
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

      return {
        id: field.id,
        name: field.name,
        jqlField: field.id,
        options: values.map(option => ({ value: option.value, label: option.value }))
      };
    } catch {
      return null;
    }
  }));

  return loaded.filter(Boolean);
}
