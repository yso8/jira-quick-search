document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('configForm');
  const testBtn = document.getElementById('testBtn');
  const statusMessage = document.getElementById('statusMessage');

  const jiraUrlInput = document.getElementById('jiraUrl');
  const jiraEmailInput = document.getElementById('jiraEmail');
  const jiraTokenInput = document.getElementById('jiraToken');

  // Charger la configuration existante
  try {
    const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
    
    if (config.jiraUrl) {
      jiraUrlInput.value = config.jiraUrl;
    }
    if (config.jiraEmail) {
      jiraEmailInput.value = config.jiraEmail;
    }
    if (config.jiraToken) {
      jiraTokenInput.value = config.jiraToken;
    }

    // IMPORTANT: Initialiser Materialize APRÈS avoir rempli les valeurs
    setTimeout(() => {
      M.updateTextFields();
    }, 100);

  } catch (error) {
    console.error('Erreur chargement config:', error);
  }

  // Tester la connexion
  testBtn.addEventListener('click', async () => {
    const url = jiraUrlInput.value.trim();
    const email = jiraEmailInput.value.trim();
    const token = jiraTokenInput.value.trim();

    if (!url || !email || !token) {
      showMessage('⚠️ Veuillez remplir tous les champs', 'orange');
      return;
    }

    // Valider l'URL
    if (!url.startsWith('https://') || !url.includes('atlassian.net')) {
      showMessage('⚠️ L\'URL doit être au format: https://votre-site.atlassian.net', 'orange');
      return;
    }

    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="material-icons left">hourglass_empty</i>Test en cours...';

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

      console.log('Réponse:', response.status, response.statusText);

      if (response.ok) {
        const user = await response.json();
        console.log('Utilisateur:', user);
        showMessage(`✅ Connexion réussie ! Bienvenue ${user.displayName}`, 'green');
      } else {
        const errorText = await response.text();
        console.error('Erreur API:', errorText);
        throw new Error(`Erreur ${response.status}: Vérifiez vos identifiants`);
      }

    } catch (error) {
      console.error('Erreur:', error);
      showMessage(`❌ Erreur: ${error.message}`, 'red');
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = '<i class="material-icons left">wifi_tethering</i>Tester la connexion';
    }
  });

  // Sauvegarder la configuration
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = jiraUrlInput.value.trim().replace(/\/$/, ''); // Retirer le / final
    const email = jiraEmailInput.value.trim();
    const token = jiraTokenInput.value.trim();

    if (!url || !email || !token) {
      showMessage('⚠️ Veuillez remplir tous les champs', 'orange');
      return;
    }

    try {
      // Sauvegarder avec await
      await chrome.storage.sync.set({
        jiraUrl: url,
        jiraEmail: email,
        jiraToken: token
      });

      console.log('Configuration sauvegardée:', { url, email, token: '***' });

      showMessage('✅ Configuration sauvegardée avec succès !', 'green');

      // Rediriger vers la page de recherche après 2s
      setTimeout(() => {
        window.location.href = 'search.html';
      }, 2000);

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showMessage(`❌ Erreur de sauvegarde: ${error.message}`, 'red');
    }
  });

  // Afficher un message de statut
  function showMessage(message, color) {
    statusMessage.style.display = 'block';
    statusMessage.innerHTML = `
      <div class="card-panel ${color} lighten-4">
        <span class="${color}-text text-darken-2">
          ${message}
        </span>
      </div>
    `;

    // Auto-masquer après 5 secondes (sauf succès sauvegarde)
    if (!message.includes('sauvegardée')) {
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 5000);
    }
  }
});