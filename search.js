// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsList = document.getElementById('resultsList');
  const resultCount = document.getElementById('resultCount');
  const emptyState = document.getElementById('emptyState');
  const initialState = document.getElementById('initialState');
  const errorMessage = document.getElementById('errorMessage');

  // Vérifier la configuration au démarrage
  const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
  
  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    showError('⚠️ Configuration manquante. Veuillez configurer l\'extension.', true);
    return;
  }

  // Focus automatique sur le champ de recherche
  searchInput.focus();

  // Event listeners
  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Fonction de recherche
  async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
      M.toast({html: '⚠️ Veuillez entrer des mots-clés', classes: 'orange'});
      return;
    }

    // Masquer tous les états
    hideAllStates();
    loadingSpinner.style.display = 'block';

    try {
      const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraToken']);
      
      // Construire la requête JQL
      const jql = `text ~ "${query}*" OR summary ~ "${query}*" OR description ~ "${query}*" ORDER BY updated DESC`;
      
      // Appel API Jira
      const url = `${config.jiraUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${config.jiraEmail}:${config.jiraToken}`),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      loadingSpinner.style.display = 'none';

      if (data.issues && data.issues.length > 0) {
        displayResults(data.issues, config.jiraUrl);
      } else {
        emptyState.style.display = 'block';
      }

    } catch (error) {
      console.error('Erreur de recherche:', error);
      loadingSpinner.style.display = 'none';
      showError(`❌ Erreur: ${error.message}`);
    }
  }

  // Afficher les résultats
  function displayResults(issues, jiraUrl) {
    resultsList.innerHTML = '';
    resultCount.textContent = issues.length;
    resultsContainer.style.display = 'block';

    issues.forEach(issue => {
      const card = createIssueCard(issue, jiraUrl);
      resultsList.appendChild(card);
    });
  }

  // Créer une carte pour un ticket
  function createIssueCard(issue, jiraUrl) {
    const col = document.createElement('div');
    col.className = 'col s12 m6 l4';

    const statusColor = getStatusColor(issue.fields.status.name);
    const issueUrl = `${jiraUrl}/browse/${issue.key}`;
    const createdDate = new Date(issue.fields.created).toLocaleDateString('fr-FR');
    const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'Non assigné';

    col.innerHTML = `
      <div class="card hoverable" style="cursor: pointer; height: 100%;" onclick="window.open('${issueUrl}', '_blank')">
        <div class="card-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="card-title blue-text text-darken-2" style="font-size: 16px; font-weight: 700;">
              ${issue.key}
            </span>
            <span class="new badge ${statusColor}" data-badge-caption="" style="position: static;">
              ${issue.fields.status.name}
            </span>
          </div>
          
          <p style="font-weight: 500; margin: 10px 0;">
            ${truncateText(issue.fields.summary, 80)}
          </p>
          
          <p class="grey-text" style="font-size: 12px; margin-top: 15px;">
            <i class="material-icons tiny">person</i> ${assignee}
          </p>
          
          <p class="grey-text" style="font-size: 12px;">
            <i class="material-icons tiny">calendar_today</i> ${createdDate}
          </p>
        </div>
      </div>
    `;

    return col;
  }

  // Couleur du badge selon le statut
  function getStatusColor(status) {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('résolu')) {
      return 'green';
    } else if (statusLower.includes('progress') || statusLower.includes('cours')) {
      return 'blue';
    } else if (statusLower.includes('todo') || statusLower.includes('open') || statusLower.includes('faire')) {
      return 'orange';
    } else {
      return 'grey';
    }
  }

  // Tronquer le texte
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Masquer tous les états
  function hideAllStates() {
    loadingSpinner.style.display = 'none';
    resultsContainer.style.display = 'none';
    emptyState.style.display = 'none';
    initialState.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  // Afficher une erreur
  function showError(message, withSettingsLink = false) {
    hideAllStates();
    errorMessage.style.display = 'block';
    
    let html = `
      <div class="card-panel red lighten-4">
        <span class="red-text text-darken-2">
          ${message}
        </span>
    `;
    
    if (withSettingsLink) {
      html += `
        <br><br>
        <a href="options.html" class="btn red darken-2 waves-effect waves-light">
          <i class="material-icons left">settings</i>
          Configurer
        </a>
      `;
    }
    
    html += `</div>`;
    errorMessage.innerHTML = html;
  }
});