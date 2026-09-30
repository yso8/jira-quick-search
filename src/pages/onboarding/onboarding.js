document.addEventListener('DOMContentLoaded', async () => {
  const locale = await JiraQuickSearchI18n.initI18n();
  const { t, applyTranslations } = JiraQuickSearchI18n;
  applyTranslations(document);
  document.documentElement.lang = locale;
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
  const labels = [t('ui_welcome'), t('ui_jira_connection'), t('ui_quick_tour')];
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
    if (!jiraUrl || !jiraEmail || !jiraToken) return showMessage(t('ui_please_fill_in_all_fields'), 'error');
    if (!isValidJiraUrl(jiraUrl)) return showMessage(t('ui_the_url_must_have_the_format_https_your_site_atlassian_'), 'error');

    button.disabled = true;
    button.textContent = t('ui_connecting');
    message.classList.add('hidden');
    try {
      await jiraRequest({ jiraUrl, jiraEmail, jiraToken }, `/rest/api/${JIRA_API_VERSION}/myself`);
      await chrome.storage.sync.set({ jiraUrl, jiraEmail, jiraToken });
      showMessage(t('ui_jira_is_connected_you_re_ready_to_get_started'), 'success');
      window.setTimeout(() => { showStep(3); createConfetti(); }, 500);
    } catch (error) {
      await debugLog('erreur connexion onboarding dédié', { status: error.status, message: error.message });
      showMessage(error.status === 401 || error.status === 403 ? t('ui_authentication_failed_check_your_email_and_token') : t('ui_could_not_connect_to_jira_check_the_url_and_try_again'), 'error');
    } finally {
      button.disabled = false;
      button.textContent = t('ui_test_and_continue');
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
