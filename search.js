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
      
      // Construire la requête JQL (EXCLUSION DES EPICS)
      const jql = `(text ~ "${query}*" OR summary ~ "${query}*" OR description ~ "${query}*") AND issuetype != Epic ORDER BY updated DESC`;
      
      // NOUVELLE API : /rest/api/3/search/jql
      const url = `${config.jiraUrl}/rest/api/3/search/jql`;
      
      console.log('🔍 Recherche avec JQL:', jql);
      console.log('📡 URL API:', url);

      const response = await fetch(url, {
        method: 'POST',
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

    // Trier les issues par clé avant l'affichage, plus récents en premier
    const sortedIssues = sortIssuesByKey(issues);

    resultCount.textContent = sortedIssues.length;
    resultsContainer.style.display = 'block';

    issues.forEach(issue => {
      const card = createIssueCard(issue, jiraUrl);
      resultsList.appendChild(card);
    });
  }

  // Créer une carte pour un ticket (VERSION COMPACTE + HAUTEUR FIXE)
  function createIssueCard(issue, jiraUrl) {
    const col = document.createElement('div');
    col.className = 'col s12 m6 l4';

    const statusColor = getStatusColor(issue.fields.status.name);
    const issueUrl = `${jiraUrl}/browse/${issue.key}`;
    const createdDate = new Date(issue.fields.created).toLocaleDateString('fr-FR');
    const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'Non assigné';
    
    // Informations supplémentaires
    const issueType = issue.fields.issuetype ? issue.fields.issuetype.name : 'N/A';
    const priority = issue.fields.priority ? issue.fields.priority.name : 'Aucune';
    
    // Couleurs pour les icônes
    const typeColor = getTypeColor(issueType);
    const priorityColor = getPriorityColor(priority);

    col.innerHTML = `
      <div class="card hoverable" style="height: 100%; display: flex; flex-direction: column;">
        <div class="card-content" style="padding: 12px; flex: 1; display: flex; flex-direction: column;">
          
          <!-- En-tête : Clé (CLIQUABLE) + Badge statut -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <a href="${issueUrl}" target="_blank" class="blue-text text-darken-2" 
              style="font-size: 14px; font-weight: 700; text-decoration: none;"
              onclick="event.stopPropagation();">
              ${issue.key}
            </a>
            <span class="new badge ${statusColor}" data-badge-caption="" style="position: static; font-size: 10px;">
              ${issue.fields.status.name}
            </span>
          </div>
          
          <!-- Titre du ticket (CLIQUABLE aussi) avec hauteur fixe -->
          <a href="${issueUrl}" target="_blank" 
            style="display: block; font-weight: 500; margin: 0 0 10px 0; font-size: 13px; line-height: 1.3; color: #212121; text-decoration: none; min-height: 34px; overflow: hidden;"
            onclick="event.stopPropagation();">
            ${truncateText(issue.fields.summary, 70)}
          </a>
          
          <!-- Informations en ligne (compactes avec icônes colorées) -->
          <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #757575; margin-top: auto;">
            
            <!-- Type -->
            <span style="display: flex; align-items: center; gap: 3px;">
              <i class="material-icons tiny" style="color: ${typeColor}; font-size: 14px;">label</i>
              <span>${issueType}</span>
            </span>
            
            <!-- Priorité -->
            <span style="display: flex; align-items: center; gap: 3px;">
              <i class="material-icons tiny" style="color: ${priorityColor}; font-size: 14px;">flag</i>
              <span>${priority}</span>
            </span>
            
            <!-- Assigné -->
            <span style="display: flex; align-items: center; gap: 3px;">
              <i class="material-icons tiny" style="color: #2196F3; font-size: 14px;">person</i>
              <span>${truncateText(assignee, 20)}</span>
            </span>
            
            <!-- Date -->
            <span style="display: flex; align-items: center; gap: 3px;">
              <i class="material-icons tiny" style="color: #9C27B0; font-size: 14px;">calendar_today</i>
              <span>${createdDate}</span>
            </span>
            
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

  // Couleur de l'icône Type (Bug, Story, Task...)
  function getTypeColor(type) {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('bug')) {
      return '#F44336'; // Rouge
    } else if (typeLower.includes('story') || typeLower.includes('récit')) {
      return '#4CAF50'; // Vert
    } else if (typeLower.includes('task') || typeLower.includes('tâche')) {
      return '#2196F3'; // Bleu
    } else if (typeLower.includes('epic')) {
      return '#9C27B0'; // Violet
    } else {
      return '#757575'; // Gris par défaut
    }
  }

  // Couleur de l'icône Priorité
  function getPriorityColor(priority) {
    const priorityLower = priority.toLowerCase();
    
    if (priorityLower.includes('highest') || priorityLower.includes('critique') || priorityLower.includes('bloquant')) {
      return '#D32F2F'; // Rouge foncé
    } else if (priorityLower.includes('high') || priorityLower.includes('haute') || priorityLower.includes('élevée')) {
      return '#FF5722'; // Orange-rouge
    } else if (priorityLower.includes('medium') || priorityLower.includes('moyenne') || priorityLower.includes('normal')) {
      return '#FF9800'; // Orange
    } else if (priorityLower.includes('low') || priorityLower.includes('basse') || priorityLower.includes('faible')) {
      return '#FFC107'; // Jaune
    } else if (priorityLower.includes('lowest') || priorityLower.includes('minimale')) {
      return '#8BC34A'; // Vert clair
    } else {
      return '#9E9E9E'; // Gris par défaut
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

    // Trier les tickets par numéro (ordre décroissant = plus récent en premier)
  function sortIssuesByKey(issues) {
    return issues.sort((a, b) => {
      // Extraire le numéro du ticket (ex: "PROJ-123" → 123)
      const numA = parseInt(a.key.split('-')[1]);
      const numB = parseInt(b.key.split('-')[1]);
      return numB - numA; // Ordre décroissant (plus récent d'abord)
    });
  }
});