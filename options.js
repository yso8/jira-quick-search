document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('configForm');
  const connectBtn = document.getElementById('connectBtn');
  const retryBtn = document.getElementById('retryBtn');
  const saveBtn = form.querySelector('button[type="submit"]');
  const statusMessage = document.getElementById('statusMessage');
  const msgContent = document.getElementById('msgContent');
  const statusIconContainer = document.getElementById('statusIconContainer');
  const jiraUrlInput = document.getElementById('jiraUrl');
  const jiraEmailInput = document.getElementById('jiraEmail');
  const jiraTokenInput = document.getElementById('jiraToken');
  const debugLogsInput = document.getElementById('debugLogs');

  saveBtn.classList.add('hidden');
  try {
    const config = await chrome.storage.sync.get(JIRA_CONFIG_KEYS);
    jiraUrlInput.value = config.jiraUrl || '';
    jiraEmailInput.value = config.jiraEmail || '';
    jiraTokenInput.value = config.jiraToken || '';
    const debugConfig = await chrome.storage.local.get({ debugLogs: false });
    debugLogsInput.checked = debugConfig.debugLogs === true;
  } catch (error) {
    await debugLog('erreur chargement configuration', { message: error.message, stack: error.stack });
  }

  connectBtn.addEventListener('click', connectAndSave);
  retryBtn.addEventListener('click', () => { statusMessage.classList.add('hidden'); jiraUrlInput.focus(); });
  form.addEventListener('submit', event => { event.preventDefault(); connectAndSave(); });

  async function connectAndSave() {
    const url = normalizeJiraUrl(jiraUrlInput.value);
    const email = jiraEmailInput.value.trim();
    const token = jiraTokenInput.value.trim();
    if (!url || !email || !token) { showMessage('Veuillez remplir tous les champs.', 'warning'); return; }
    if (!isValidJiraUrl(url)) { showMessage('L’URL doit être au format https://votre-site.atlassian.net.', 'warning'); return; }

    setLoading(true);
    try {
      const response = await jiraRequest({ jiraUrl: url, jiraEmail: email, jiraToken: token }, `/rest/api/${JIRA_API_VERSION}/myself`);
      if (!response.ok) throw new Error(`Erreur ${response.status}. Vérifiez vos identifiants.`);
      await chrome.storage.sync.set({ jiraUrl: url, jiraEmail: email, jiraToken: token });
      await chrome.storage.local.set({ debugLogs: debugLogsInput.checked });
      showMessage('Connexion réussie. Votre recherche est prête.', 'success');
      setTimeout(() => { window.location.href = 'search.html'; }, 900);
    } catch (error) {
      await debugLog('erreur connexion onboarding', { message: error.message, stack: error.stack });
      showMessage(`Impossible de se connecter : ${error.message}`, 'error');
      retryBtn.classList.remove('hidden');
    } finally { setLoading(false); }
  }

  function setLoading(isLoading) {
    connectBtn.disabled = isLoading;
    retryBtn.disabled = isLoading;
    connectBtn.textContent = isLoading ? 'Connexion en cours…' : 'Se connecter';
  }

  function showMessage(message, type) {
    statusMessage.className = 'p-4 mb-4 text-sm rounded-lg flex items-center border';
    statusMessage.classList.remove('hidden');
    const colors = { success: ['text-green-800', 'bg-green-50', 'border-green-100'], error: ['text-red-800', 'bg-red-50', 'border-red-100'], warning: ['text-orange-800', 'bg-orange-50', 'border-orange-100'] };
    statusMessage.classList.add(...(colors[type] || ['text-blue-800', 'bg-blue-50', 'border-blue-100']));
    msgContent.textContent = message;
    statusIconContainer.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
  }
});
