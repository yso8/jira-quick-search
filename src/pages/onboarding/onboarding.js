document.addEventListener('DOMContentLoaded', async () => {
  const steps = [...document.querySelectorAll('[data-step]')];
  const dots = [...document.querySelectorAll('[data-step-dot]')];
  const stepLabel = document.getElementById('stepLabel');
  const form = document.getElementById('onboardingForm');
  const message = document.getElementById('onboardingMessage');
  const button = document.getElementById('testConnectionBtn');
  const fields = {
    jiraUrl: document.getElementById('onboardingJiraUrl'),
    jiraEmail: document.getElementById('onboardingJiraEmail'),
    jiraToken: document.getElementById('onboardingJiraToken')
  };
  const labels = ['Bienvenue', 'Connexion Jira', 'Découverte rapide'];
  let currentStep = 1;

  const config = await chrome.storage.sync.get(JIRA_CONFIG_KEYS);
  fields.jiraUrl.value = config.jiraUrl || '';
  fields.jiraEmail.value = config.jiraEmail || '';
  fields.jiraToken.value = config.jiraToken || '';

  document.getElementById('startBtn').addEventListener('click', () => showStep(2));
  document.getElementById('skipBtn').addEventListener('click', () => {
    if (config.jiraUrl && config.jiraEmail && config.jiraToken) window.location.href = 'search.html';
    else showStep(2);
  });
  document.getElementById('continueBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ onboardingCompleted: true });
    window.location.href = 'search.html';
  });
  form.addEventListener('submit', testConnection);

  function showStep(step) {
    currentStep = step;
    steps.forEach(item => item.classList.toggle('hidden', Number(item.dataset.step) !== step));
    dots.forEach(dot => {
      const active = Number(dot.dataset.stepDot) <= step;
      dot.className = `h-2 w-2 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-200'}`;
    });
    stepLabel.textContent = labels[step - 1];
  }

  async function testConnection(event) {
    event.preventDefault();
    const jiraUrl = normalizeJiraUrl(fields.jiraUrl.value);
    const jiraEmail = fields.jiraEmail.value.trim();
    const jiraToken = fields.jiraToken.value.trim();
    if (!jiraUrl || !jiraEmail || !jiraToken) return showMessage('Veuillez remplir tous les champs.', 'error');
    if (!isValidJiraUrl(jiraUrl)) return showMessage('L’URL doit être au format https://votre-site.atlassian.net.', 'error');

    button.disabled = true;
    button.textContent = 'Connexion en cours…';
    message.classList.add('hidden');
    try {
      await jiraRequest({ jiraUrl, jiraEmail, jiraToken }, `/rest/api/${JIRA_API_VERSION}/myself`);
      await chrome.storage.sync.set({ jiraUrl, jiraEmail, jiraToken });
      showMessage('Jira est connecté. Vous êtes prêt à commencer.', 'success');
      window.setTimeout(() => { showStep(3); createConfetti(); }, 500);
    } catch (error) {
      await debugLog('erreur connexion onboarding dédié', { status: error.status, message: error.message });
      showMessage(error.status === 401 || error.status === 403 ? 'L’authentification a échoué. Vérifiez votre e-mail et votre token.' : 'Impossible de se connecter à Jira. Vérifiez l’URL et réessayez.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Tester et continuer';
    }
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `rounded-lg border p-3 text-sm ${type === 'success' ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-red-200 bg-red-50 text-red-800'}`;
  }

  function createConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.getElementById('confettiLayer');
    for (let index = 0; index < 18; index += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti absolute left-1/2 top-1/3 h-2 w-1 rounded-sm';
      piece.style.backgroundColor = ['#1A56DB', '#6D28D9', '#F97316'][index % 3];
      piece.style.setProperty('--x', `${(index % 2 ? 1 : -1) * (40 + index * 8)}px`);
      piece.style.setProperty('--y', `${80 + (index % 5) * 18}px`);
      layer.appendChild(piece);
    }
    window.setTimeout(() => layer.replaceChildren(), 1000);
  }
});
