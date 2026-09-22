document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('quickSearchForm');
  const input = document.getElementById('quickSearchInput');
  const error = document.getElementById('quickSearchError');

  input.focus();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const value = input.value.trim();
    error.classList.add('hidden');

    const config = await chrome.storage.sync.get(JIRA_CONFIG_KEYS);
    if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      window.close();
      return;
    }
    if (!value) {
      openSearch();
      return;
    }

    if (/^[A-Z][A-Z0-9]*-\d+$/i.test(value)) {
      try {
        await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/issue/${encodeURIComponent(value)}?fields=summary`);
        chrome.tabs.create({ url: `${normalizeJiraUrl(config.jiraUrl)}/browse/${encodeURIComponent(value.toUpperCase())}` });
        window.close();
        return;
      } catch (requestError) {
        await debugLog('ticket popup introuvable', { message: requestError.message });
        showError('Ticket introuvable. Vérifiez la clé Jira.');
        return;
      }
    }
    openSearch(value);
  });

  function openSearch(query = '') {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    chrome.tabs.create({ url: chrome.runtime.getURL(`search.html${suffix}`) });
    window.close();
  }

  function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
  }
});
