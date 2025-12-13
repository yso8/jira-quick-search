document.addEventListener('DOMContentLoaded', async () => {
  // Éléments du DOM
  const form = document.getElementById('configForm');
  const testBtn = document.getElementById('testBtn');

  // Éléments pour les messages d'erreur/succès
  const statusMessage = document.getElementById('statusMessage');
  const msgContent = document.getElementById('msgContent');
  const statusIconContainer = document.getElementById('statusIconContainer'); // Assure-toi que cet ID existe dans ton HTML

  // Champs du formulaire
  const jiraUrlInput = document.getElementById('jiraUrl');
  const jiraEmailInput = document.getElementById('jiraEmail');
  const jiraTokenInput = document.getElementById('jiraToken');

  // 1. Charger la configuration existante
  try {
    const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
    if (config.jiraUrl) jiraUrlInput.value = config.jiraUrl;
    if (config.jiraEmail) jiraEmailInput.value = config.jiraEmail;
    if (config.jiraToken) jiraTokenInput.value = config.jiraToken;

    // NOTE: On a supprimé 'M.updateTextFields()' car inutile avec Tailwind
  } catch (error) {
    console.error('Erreur chargement config:', error);
  }

  // 2. Tester la connexion
  testBtn.addEventListener('click', async () => {
    const url = jiraUrlInput.value.trim();
    const email = jiraEmailInput.value.trim();
    const token = jiraTokenInput.value.trim();

    if (!url || !email || !token) {
      showMessage('Veuillez remplir tous les champs', 'warning');
      return;
    }

    if (!url.startsWith('https://') || !url.includes('atlassian.net')) {
      showMessage('L\'URL doit être au format: https://votre-site.atlassian.net', 'warning');
      return;
    }

    // État de chargement (Spinner SVG)
    testBtn.disabled = true;
    testBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Test en cours...
        `;

    try {
      const apiUrl = `${url}/rest/api/3/myself`;
      console.log('Test connexion vers:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${email}:${token}`),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const user = await response.json();
        showMessage(`Connexion réussie ! Bienvenue ${user.displayName || ''}`, 'success');
      } else {
        const errorText = await response.text();
        console.error('Erreur API:', errorText);
        throw new Error(`Erreur ${response.status}: Vérifiez vos identifiants`);
      }

    } catch (error) {
      console.error('Erreur:', error);
      showMessage(`Erreur: ${error.message}`, 'error');
    } finally {
      // Rétablir le bouton (Icône Wifi SVG)
      testBtn.disabled = false;
      testBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-gray-400">
                    <path d="M16.855 7.287a.75.75 0 00-1.07 1.052c.906.921 1.465 2.183 1.465 3.565 0 1.382-.559 2.644-1.465 3.565a.75.75 0 101.07 1.052c1.176-1.196 1.902-2.837 1.902-4.617 0-1.78-.726-3.421-1.902-4.617z" />
                    <path d="M3.145 7.287a.75.75 0 011.07 1.052A5.13 5.13 0 002.75 11.904c0 1.382.559 2.644 1.465 3.565a.75.75 0 11-1.07 1.052C1.969 15.325 1.243 13.684 1.243 11.904c0-1.78.726-3.421 1.902-4.617z" />
                    <path d="M13.654 9.423a.75.75 0 00-1.058 1.062C13.208 11.094 13.568 11.93 13.568 12.82c0 .89-.36 1.726-.972 2.335a.75.75 0 101.058 1.062c.883-.878 1.402-2.083 1.402-3.397 0-1.314-.52-2.52-1.402-3.397z" />
                    <path d="M6.346 9.423a.75.75 0 011.058 1.062A3.29 3.29 0 006.432 12.82c0 .89.36 1.726.972 2.335a.75.75 0 11-1.058 1.062C5.463 15.339 4.944 14.134 4.944 12.82c0-1.314.52-2.52 1.402-3.397z" />
                    <path d="M10 11.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" />
                </svg>
                Tester
            `;
    }
  });

  // 3. Sauvegarder la configuration
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = jiraUrlInput.value.trim().replace(/\/$/, '');
    const email = jiraEmailInput.value.trim();
    const token = jiraTokenInput.value.trim();

    if (!url || !email || !token) {
      showMessage('Veuillez remplir tous les champs', 'warning');
      return;
    }

    try {
      await chrome.storage.sync.set({ jiraUrl: url, jiraEmail: email, jiraToken: token });
      showMessage('Configuration sauvegardée avec succès !', 'success');

      setTimeout(() => {
        window.location.href = 'search.html';
      }, 1500);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showMessage(`Erreur de sauvegarde: ${error.message}`, 'error');
    }
  });

  // 4. Fonction d'affichage (Style Tailwind + SVG)
  function showMessage(message, type) {
    // Reset classes de base
    statusMessage.className = 'p-4 mb-4 text-sm rounded-lg flex items-center border';
    statusMessage.classList.remove('hidden');

    // SVG Icons definitions
    const iconSuccess = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-green-700"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>`;
    const iconError = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-red-700"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`;
    const iconInfo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-blue-700"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" /></svg>`;
    const iconWarning = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-orange-700"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`;

    if (type === 'success' || type === 'green') {
      statusMessage.classList.add('text-green-800', 'bg-green-50', 'border-green-100');
      if (statusIconContainer) statusIconContainer.innerHTML = iconSuccess;
    } else if (type === 'error' || type === 'red') {
      statusMessage.classList.add('text-red-800', 'bg-red-50', 'border-red-100');
      if (statusIconContainer) statusIconContainer.innerHTML = iconError;
    } else if (type === 'warning' || type === 'orange') {
      statusMessage.classList.add('text-orange-800', 'bg-orange-50', 'border-orange-100');
      if (statusIconContainer) statusIconContainer.innerHTML = iconWarning;
    } else {
      statusMessage.classList.add('text-blue-800', 'bg-blue-50', 'border-blue-100');
      if (statusIconContainer) statusIconContainer.innerHTML = iconInfo;
    }

    if (msgContent) msgContent.textContent = message;

    // Auto-masquer
    if (!message.includes('sauvegardée')) {
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 5000);
    }
  }

  // 5. GESTION DE L'ACCORDÉON (Fix manuel)
  const accordionBtn = document.querySelector('button[data-accordion-target]');
  if (accordionBtn) {
    accordionBtn.addEventListener('click', () => {
      const targetId = accordionBtn.getAttribute('data-accordion-target');
      const targetEl = document.querySelector(targetId);
      const icon = accordionBtn.querySelector('[data-accordion-icon]');

      if (targetEl) targetEl.classList.toggle('hidden');
      if (icon) icon.classList.toggle('rotate-180');

      const isExpanded = accordionBtn.getAttribute('aria-expanded') === 'true';
      accordionBtn.setAttribute('aria-expanded', !isExpanded);

      accordionBtn.classList.toggle('bg-gray-100');
    });
  }
});