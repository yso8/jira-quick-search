// Ouvrir la page de recherche au clic sur l'icône
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('search.html')
  });
});

// Vérifier la configuration au démarrage
chrome.runtime.onInstalled.addListener(async () => {
  const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
  
  // Si pas configuré, ouvrir la page d'options
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    chrome.runtime.openOptionsPage();
  } else {
    // Sinon, ouvrir la page de recherche
    chrome.tabs.create({
      url: chrome.runtime.getURL('search.html')
    });
  }
});