importScripts('src/services/jira/jira-api.js', 'src/services/diagnostics/debug-logger.js');

async function getStoredConfig() {
  const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
  return config.jiraUrl && config.jiraEmail && config.jiraToken ? config : null;
}

function openExtensionPage(query = '') {
  return getStoredConfig().then(config => {
    const page = config ? `search.html${query ? `?q=${encodeURIComponent(query)}` : ''}` : 'onboarding.html';
    chrome.tabs.create({ url: chrome.runtime.getURL(page) });
  });
}

async function openQuickSearchPopup() {
  const config = await getStoredConfig();
  if (!config) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    return;
  }
  if (chrome.action && chrome.action.openPopup) {
    await chrome.action.openPopup();
    return;
  }
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
}

function isJiraIssueKey(value) {
  return /^[A-Z][A-Z0-9]*-\d+$/i.test(value.trim());
}

chrome.commands.onCommand.addListener(command => {
  if (command === 'open_search') openQuickSearchPopup();
});

function suggestOmniboxResults(text, suggest) {
  const value = text.trim();
  if (!value) {
    suggest([]);
    return;
  }
  suggest([
    { content: value, description: `Rechercher dans Jira : ${value}` }
  ]);
}

chrome.omnibox.onInputChanged.addListener(suggestOmniboxResults);

chrome.omnibox.onInputEntered.addListener(async text => {
  const value = text.trim();
  const config = await getStoredConfig();
  if (!config) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    return;
  }

  if (!value) {
    openExtensionPage();
    return;
  }

  if (isJiraIssueKey(value)) {
    try {
      await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/issue/${encodeURIComponent(value)}?fields=summary`);
      chrome.tabs.create({ url: `${normalizeJiraUrl(config.jiraUrl)}/browse/${encodeURIComponent(value.toUpperCase())}` });
      return;
    } catch (error) {
      await debugLog('ticket omnibox introuvable', { message: error.message });
    }
  }

  openExtensionPage(value);
});

// Vérifier la configuration au démarrage
chrome.runtime.onInstalled.addListener(async () => {
  const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
  // Si pas configuré, ouvrir l’onboarding dédié
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  } else {
    // Sinon, ouvrir la page de recherche
    chrome.tabs.create({
      url: chrome.runtime.getURL('search.html')
    });
  }
});
