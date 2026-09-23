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
  const diagnosticBtn = document.getElementById('diagnosticBtn');
  const diagnosticChecks = document.getElementById('diagnosticChecks');
  const diagnosticSummary = document.getElementById('diagnosticSummary');
  const copyDiagnosticBtn = document.getElementById('copyDiagnosticBtn');
  const lastDiagnostic = document.getElementById('lastDiagnostic');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const clearDataMessage = document.getElementById('clearDataMessage');
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackType = document.getElementById('feedbackType');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackDescription = document.getElementById('feedbackDescription');
  const feedbackReproducibleLabel = document.getElementById('feedbackReproducibleLabel');
  const feedbackReproducible = document.getElementById('feedbackReproducible');
  const feedbackTechnical = document.getElementById('feedbackTechnical');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const feedbackTypeButtons = document.querySelectorAll('.feedback-type-btn');
  const accordionButton = document.querySelector('[data-accordion-target="#accordion-collapse-body-1"]');
  const accordionBody = document.getElementById('accordion-collapse-body-1');
  const accordionIcon = accordionButton?.querySelector('[data-accordion-icon]');
  const reviewOnboardingBtn = document.getElementById('reviewOnboardingBtn');
  let latestDiagnostic = null;

  reviewOnboardingBtn?.addEventListener('click', async () => {
    await chrome.storage.local.set({ onboardingCompleted: false });
    window.location.href = 'onboarding.html';
  });

  if (accordionButton && accordionBody) {
    accordionButton.addEventListener('click', () => {
      const isOpen = accordionButton.getAttribute('aria-expanded') === 'true';
      const nextOpen = !isOpen;
      accordionButton.setAttribute('aria-expanded', String(nextOpen));
      accordionBody.classList.toggle('hidden', !nextOpen);
      accordionIcon?.classList.toggle('rotate-180', nextOpen);
    });
  }

  saveBtn.classList.add('hidden');
  try {
    const config = await chrome.storage.sync.get(JIRA_CONFIG_KEYS);
    jiraUrlInput.value = config.jiraUrl || '';
    jiraEmailInput.value = config.jiraEmail || '';
    jiraTokenInput.value = config.jiraToken || '';
    const debugConfig = await chrome.storage.local.get({ debugLogs: false });
    debugLogsInput.checked = debugConfig.debugLogs === true;
    const diagnosticConfig = await chrome.storage.local.get({ lastDiagnosticAt: null });
    if (diagnosticConfig.lastDiagnosticAt) {
      lastDiagnostic.textContent = `Dernier diagnostic : ${new Date(diagnosticConfig.lastDiagnosticAt).toLocaleString('fr-FR')}`;
    }
  } catch (error) {
    await debugLog('erreur chargement configuration', { message: error.message, stack: error.stack });
  }

  connectBtn.addEventListener('click', connectAndSave);
  retryBtn.addEventListener('click', () => { statusMessage.classList.add('hidden'); jiraUrlInput.focus(); });
  form.addEventListener('submit', event => { event.preventDefault(); connectAndSave(); });
  diagnosticBtn.addEventListener('click', runDiagnostics);
  copyDiagnosticBtn.addEventListener('click', async () => {
    if (!latestDiagnostic) return;
    await navigator.clipboard.writeText(createTechnicalDetails(latestDiagnostic));
    copyDiagnosticBtn.textContent = 'Détails copiés';
  });
  clearDataBtn.addEventListener('click', async () => {
    if (!window.confirm('Supprimer toutes les données locales de l’extension ? Cette action est irréversible.')) return;
    clearDataBtn.disabled = true;
    clearDataMessage.textContent = 'Suppression en cours…';
    try {
      await clearExtensionData(chrome.storage);
      clearDataMessage.textContent = 'Données supprimées. Redirection vers l’accueil…';
      window.location.href = 'options.html';
    } catch (error) {
      clearDataBtn.disabled = false;
      clearDataMessage.textContent = 'Impossible de supprimer les données. Réessayez.';
      await debugLog('erreur suppression données', { message: error.message });
    }
  });
  feedbackTypeButtons.forEach(button => button.addEventListener('click', () => {
    feedbackType.value = button.dataset.feedbackType;
    feedbackForm.classList.remove('hidden');
    updateFeedbackType();
    feedbackTitle.focus();
  }));
  feedbackType.addEventListener('change', updateFeedbackType);
  document.getElementById('cancelFeedbackBtn').addEventListener('click', resetFeedbackForm);
  feedbackForm.addEventListener('submit', prepareFeedback);

  async function connectAndSave() {
    const url = normalizeJiraUrl(jiraUrlInput.value);
    const email = jiraEmailInput.value.trim();
    const token = jiraTokenInput.value.trim();
    if (!url || !email || !token) { showMessage('Veuillez remplir tous les champs.', 'warning'); return; }
    if (!isValidJiraUrl(url)) { showMessage('L’URL doit être au format https://votre-site.atlassian.net.', 'warning'); return; }

    setLoading(true);
    try {
      const response = await jiraRequest({ jiraUrl: url, jiraEmail: email, jiraToken: token }, `/rest/api/${JIRA_API_VERSION}/myself`);
      if (!response.ok) throw Object.assign(new Error('Authentification Jira refusée.'), { status: response.status });
      await chrome.storage.sync.set({ jiraUrl: url, jiraEmail: email, jiraToken: token });
      await chrome.storage.local.set({ debugLogs: debugLogsInput.checked });
      showMessage('Connexion réussie. Votre recherche est prête.', 'success');
      setTimeout(() => { window.location.href = 'search.html'; }, 900);
    } catch (error) {
      await debugLog('erreur connexion onboarding', { status: error.status, message: error.message });
      showMessage(error.status === 401 || error.status === 403 ? 'L’authentification Jira a échoué. Vérifiez votre token ou générez-en un nouveau.' : 'Impossible de se connecter à Jira. Vérifiez l’URL ou votre connexion réseau.', 'error');
      retryBtn.classList.remove('hidden');
    } finally { setLoading(false); }
  }

  async function runDiagnostics() {
    diagnosticBtn.disabled = true;
    diagnosticBtn.textContent = 'Diagnostic en cours…';
    diagnosticSummary.textContent = 'Vérification de la configuration et de l’accès Jira…';
    try {
      latestDiagnostic = await runConnectionDiagnostics({ jiraUrl: jiraUrlInput.value, jiraEmail: jiraEmailInput.value.trim(), jiraToken: jiraTokenInput.value.trim() });
      renderDiagnostics(latestDiagnostic);
      await chrome.storage.local.set({ lastDiagnosticAt: new Date().toISOString() });
    } catch (error) {
      latestDiagnostic = { overall: 'error', checks: [{ id: 'diagnostic', label: 'Diagnostic', status: 'error', message: 'Le diagnostic n’a pas pu être terminé.', action: 'Réessayer.' }] };
      renderDiagnostics(latestDiagnostic);
      await debugLog('erreur diagnostic', { message: error.message });
    } finally {
      diagnosticBtn.disabled = false;
      diagnosticBtn.textContent = 'Tester la connexion';
    }
  }

  function renderDiagnostics(result) {
    diagnosticSummary.textContent = result.overall === 'success' ? 'Connexion valide et recherche disponible.' : result.overall === 'warning' ? 'Connexion valide avec une limitation de permissions.' : 'Un problème nécessite votre attention.';
    diagnosticChecks.replaceChildren(...result.checks.map(check => {
      const item = document.createElement('li');
      item.className = 'rounded-lg border border-gray-100 p-3 text-sm';
      const marker = check.status === 'success' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
      item.innerHTML = `<div class="flex gap-2"><span aria-hidden="true">${marker}</span><div><strong>${escapeHtml(check.label)}</strong><p class="text-gray-600">${escapeHtml(check.message)}</p>${check.action ? `<p class="mt-1 text-xs text-gray-500">Action : ${escapeHtml(check.action)}</p>` : ''}</div></div>`;
      return item;
    }));
    copyDiagnosticBtn.classList.remove('hidden');
    lastDiagnostic.textContent = `Dernier diagnostic : ${new Date().toLocaleString('fr-FR')}`;
  }

  function updateFeedbackType() {
    const isBug = feedbackType.value === 'bug';
    feedbackReproducibleLabel.classList.toggle('hidden', !isBug);
    feedbackReproducibleLabel.classList.toggle('flex', isBug);
  }

  function resetFeedbackForm() {
    feedbackForm.reset();
    feedbackForm.classList.add('hidden');
    feedbackMessage.className = 'hidden rounded-lg border p-3 text-sm';
    feedbackMessage.textContent = '';
    updateFeedbackType();
  }

  async function prepareFeedback(event) {
    event.preventDefault();
    const input = {
      type: feedbackType.value,
      title: feedbackTitle.value,
      description: feedbackDescription.value
    };
    const validation = validateFeedback(input);
    if (!validation.valid) {
      showFeedbackMessage(validation.message, 'error');
      return;
    }

    const manifest = chrome.runtime.getManifest();
    const technicalInfo = buildTechnicalInfo({
      version: manifest.version,
      browser: navigator.userAgent,
      platform: navigator.platform || 'inconnu',
      manifestVersion: manifest.manifest_version,
      instanceType: getInstanceType(jiraUrlInput.value),
      diagnosticStatus: diagnosticSummary.textContent || 'Non exécuté'
    });
    const body = buildFeedbackBody({
      type: input.type,
      description: input.description,
      reproducible: feedbackReproducible.checked,
      includeTechnical: feedbackTechnical.checked,
      technicalInfo
    });
    const url = buildGithubIssueUrl({ type: input.type, title: input.title, body });
    try {
      await chrome.tabs.create({ url });
      showFeedbackMessage('Votre brouillon GitHub est prêt. Vérifiez son contenu avant de le publier.', 'success');
    } catch (error) {
      showFeedbackMessage('Impossible d’ouvrir GitHub. Vérifiez votre connexion réseau et réessayez.', 'error');
      await debugLog('erreur ouverture feedback GitHub', { message: error.message });
    }
  }

  function getInstanceType(value) {
    try {
      return new URL(normalizeJiraUrl(value)).hostname.endsWith('.atlassian.net') ? 'Cloud' : 'Non déterminé';
    } catch {
      return 'Non déterminé';
    }
  }

  function showFeedbackMessage(message, type) {
    feedbackMessage.className = `rounded-lg border p-3 text-sm ${type === 'success' ? 'border-green-100 bg-green-50 text-green-800' : 'border-red-100 bg-red-50 text-red-800'}`;
    feedbackMessage.textContent = message;
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
