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
      
      // ✅ NOUVELLE API : /rest/api/3/search/jql
      const url = `${config.jiraUrl}/rest/api/3/search/jql`;
      
      console.log('🔍 Recherche avec JQL:', jql);
      console.log('📡 URL API:', url);

      const response = await fetch(url, {
        method: 'POST', // ⚠️ POST au lieu de GET
        headers: {
          'Authorization': 'Basic ' + btoa(`${config.jiraEmail}:${config.jiraToken}`),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jql: jql,
          maxResults: 50,
          fields: ['summary', 'status', 'assignee', 'created', 'issuetype', 'priority']
        })
      });

      console.log('📊 Statut réponse:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API:', errorText);
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Résultats reçus:', data.total || data.issues?.length || 0, 'ticket(s)');

      loadingSpinner.style.display = 'none';

      if (data.issues && data.issues.length > 0) {
        displayResults(data.issues, config.jiraUrl);
      } else {
        emptyState.style.display = 'block';
      }

    } catch (error) {
      console.error('❌ Erreur de recherche:', error);
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
    
    // Informations supplémentaires (si disponibles)
    const issueType = issue.fields.issuetype ? issue.fields.issuetype.name : 'N/A';
    const priority = issue.fields.priority ? issue.fields.priority.name : 'Aucune';

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
          
          <div style="margin-top: 15px; font-size: 12px; color: #757575;">
            <p class="grey-text" style="margin: 5px 0;">
              <i class="material-icons tiny">label</i> ${issueType}
            </p>
            <p class="grey-text" style="margin: 5px 0;">
              <i class="material-icons tiny">flag</i> ${priority}
            </p>
            <p class="grey-text" style="margin: 5px 0;">
              <i class="material-icons tiny">person</i> ${assignee}
            </p>
            <p class="grey-text" style="margin: 5px 0;">
              <i class="material-icons tiny">calendar_today</i> ${createdDate}
            </p>
          </div>
        </div>
      </div>
    `;

    return col;
  }

  // Couleur du badge selon le statut
  function getStatusColor(status) {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('done') || statusLower.includes('closed') || statusLower.includes('résolu') || statusLower.includes('terminé')) {
      return 'green';
    } else if (statusLower.includes('progress') || statusLower.includes('cours') || statusLower.includes('en cours')) {
      return 'blue';
    } else if (statusLower.includes('todo') || statusLower.includes('open') || statusLower.includes('faire') || statusLower.includes('à faire')) {
      return 'orange';
    } else if (statusLower.includes('review') || statusLower.includes('test')) {
      return 'purple';
    } else {
      return 'grey';
    }
  }

  // Tronquer le texte
  function truncateText(text, maxLength) {
    if (!text) return 'N/A';
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