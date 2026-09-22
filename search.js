// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsList = document.getElementById('resultsList');
  const resultCount = document.getElementById('resultCount');
  const emptyState = document.getElementById('emptyState');
  const initialState = document.getElementById('initialState');
  const errorMessage = document.getElementById('errorMessage');
  const filterBar = document.getElementById('filterBar');
  const filterLoading = document.getElementById('filterLoading');
  const filterControls = document.getElementById('filterControls');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  const PAGE_SIZE = 25;
  let currentJql = '';
  let currentPage = 0;
  let totalResults = 0;
  let hasNextPage = false;
  let pageTokens = [null]; // pageTokens[i] = nextPageToken pour accéder à la page i
  let availableFilters = [];
  const selectedFilters = {};

  // Vérifier la configuration au démarrage
  const config = await loadJiraConfig();

  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    showError('⚠️ Configuration manquante. Veuillez configurer l\'extension.', true);
    return;
  }

  filterBar.classList.remove('hidden');
  try {
    availableFilters = await fetchFilterMetadata(config);
    renderFilterControls();
  } catch (error) {
    filterBar.classList.add('hidden');
    showError(`Impossible de charger les filtres Jira : ${error.message}`);
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

  searchForm.addEventListener('submit', (e) => { e.preventDefault(); performSearch(); });
  clearFiltersBtn.addEventListener('click', clearFilters);
  filterControls.addEventListener('click', handleFilterClick);
  document.getElementById('prevPageBtn').addEventListener('click', () => fetchPage(currentPage - 1));
  document.getElementById('nextPageBtn').addEventListener('click', () => fetchPage(currentPage + 1));

  // Nouvelle recherche : construit le JQL et lance la page 0
  async function performSearch() {
    const query = searchInput.value.trim();
    const showTasks = document.getElementById('filterTasks').checked;
    const showEpics = document.getElementById('filterEpics').checked;
    const typeFilters = [];
    if (showTasks && !showEpics) typeFilters.push({ id: 'task-mode', jqlField: 'issuetype', value: '!= Epic' });
    if (!showTasks && showEpics) typeFilters.push({ id: 'epic-mode', jqlField: 'issuetype', value: '= Epic' });

    currentJql = buildFilterJql(query, selectedFilters, availableFilters);
    typeFilters.forEach(filter => {
      currentJql = currentJql.replace(' ORDER BY updated DESC', ` AND ${filter.jqlField} ${filter.value} ORDER BY updated DESC`);
    });
    pageTokens = [null]; // reset des tokens à chaque nouvelle recherche

    await fetchPage(0);
  }

  function renderFilterControls() {
    filterLoading.classList.add('hidden');
    filterControls.classList.remove('hidden');
    filterControls.innerHTML = availableFilters.map(filter => `
      <div class="relative">
        <button id="filter-button-${filter.id}" data-dropdown-toggle="filter-menu-${filter.id}" data-filter-button="${filter.id}" type="button" ${filter.options.length ? '' : 'disabled'} class="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
          <span>${escapeHtml(filter.name)}</span>
          <span data-filter-label="${filter.id}" class="hidden inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800"></span>
          <svg class="w-2.5 h-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/></svg>
        </button>
        <div id="filter-menu-${filter.id}" class="z-10 hidden w-64 max-h-72 overflow-y-auto bg-white divide-y divide-gray-100 rounded-lg shadow" role="menu" aria-labelledby="filter-button-${filter.id}">
          <ul class="p-2 text-sm text-gray-700" data-filter-options="${filter.id}">
            ${filter.options.length
              ? filter.options.map(option => `<li><button type="button" data-filter-id="${filter.id}" data-filter-value="${escapeHtml(option.value)}" class="w-full text-left rounded px-3 py-2 hover:bg-gray-100">${escapeHtml(option.label)}</button></li>`).join('')
              : '<li><span class="block px-3 py-2 text-gray-500">Aucune valeur disponible</span></li>'}
          </ul>
        </div>
      </div>
    `).join('');
    const FlowbiteDropdown = window.Dropdown;
    if (typeof FlowbiteDropdown !== 'function' && typeof window.initDropdowns !== 'function') {
      debugLog('Flowbite dropdown indisponible', { loaded: Boolean(window.Flowbite) });
      return;
    }

    availableFilters.forEach(filter => {
      if (!filter.options.length) return;
      const button = document.getElementById(`filter-button-${filter.id}`);
      const menu = document.getElementById(`filter-menu-${filter.id}`);
      if (typeof FlowbiteDropdown === 'function') {
        new FlowbiteDropdown(menu, button, { placement: 'bottom-start' });
      }
    });
    if (typeof window.initDropdowns === 'function') window.initDropdowns();
  }

  function handleFilterClick(event) {
    const option = event.target.closest('[data-filter-id]');
    if (!option) return;
    const filterId = option.dataset.filterId;
    selectedFilters[filterId] = option.dataset.filterValue;
    const label = filterControls.querySelector(`[data-filter-label="${filterId}"]`);
    const filter = availableFilters.find(item => item.id === filterId);
    const selected = filter.options.find(item => item.value === selectedFilters[filterId]);
    label.textContent = selected ? selected.label : '';
    label.classList.remove('hidden');
    clearFiltersBtn.classList.remove('hidden');
  }

  function clearFilters() {
    Object.keys(selectedFilters).forEach(key => delete selectedFilters[key]);
    filterControls.querySelectorAll('[data-filter-label]').forEach(label => {
      label.textContent = '';
      label.classList.add('hidden');
    });
    clearFiltersBtn.classList.add('hidden');
  }

  // Fetch une page spécifique (pagination par curseur nextPageToken)
  async function fetchPage(page) {
    hideAllStates();
    loadingSpinner.style.display = 'block';

    try {
      const config = await loadJiraConfig();

      const body = {
        jql: currentJql,
        maxResults: PAGE_SIZE,
        fields: ['summary', 'status', 'assignee', 'created', 'issuetype', 'priority']
      };
      if (pageTokens[page]) {
        body.nextPageToken = pageTokens[page];
      }

      const response = await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/search/jql`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      loadingSpinner.style.display = 'none';

      if (data.issues && data.issues.length > 0) {
        currentPage = page;
        totalResults = data.total || null;
        hasNextPage = !!data.nextPageToken;
        if (data.nextPageToken && !pageTokens[page + 1]) {
          pageTokens[page + 1] = data.nextPageToken;
        }
        displayResults(data.issues, config.jiraUrl);
      } else {
        emptyState.style.display = 'block';
      }

    } catch (error) {
      await debugLog('erreur de recherche', { message: error.message, stack: error.stack });
      loadingSpinner.style.display = 'none';
      showError(`❌ Erreur: ${error.message}`);
    }
  }

  // Afficher les résultats
  function displayResults(issues, jiraUrl) {
    resultsList.innerHTML = '';

    const sortedIssues = sortIssuesByKey(issues);
    const from = currentPage * PAGE_SIZE + 1;
    const to = from + sortedIssues.length - 1;

    resultCount.textContent = totalResults !== null ? totalResults : `${to}+`;
    resultsContainer.style.display = 'block';

    sortedIssues.forEach(issue => {
      const card = createIssueCard(issue, jiraUrl);
      resultsList.appendChild(card);
    });

    // Pagination
    const paginationControls = document.getElementById('paginationControls');
    const showPagination = currentPage > 0 || hasNextPage;

    if (showPagination) {
      paginationControls.classList.remove('hidden');
      const pageLabel = totalResults !== null
        ? `${from}–${to} sur ${totalResults}`
        : `Page ${currentPage + 1}`;
      document.getElementById('pageInfo').textContent = pageLabel;
      document.getElementById('prevPageBtn').disabled = currentPage === 0;
      document.getElementById('nextPageBtn').disabled = !hasNextPage;
    } else {
      paginationControls.classList.add('hidden');
    }
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

    // ... (code précédent : définitions de issueUrl, statusColor, etc.) ...

    col.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full group relative">
        <div class="p-4 flex flex-col h-full">

            <!-- LIGNE 1 : En-tête -->
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-3">
                    <input type="checkbox" class="select-ticket-cb w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" value="${issueUrl}">
                    <a href="${issueUrl}" target="_blank" class="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                        ${escapeHtml(issue.key)}
                    </a>
                </div>
                <span class="${statusColor} text-xs font-medium px-2.5 py-0.5 rounded border border-transparent inline-flex items-center bg-gray-100 text-gray-800">
                    ${escapeHtml(issue.fields.status.name)}
                </span>
            </div>

            <!-- LIGNE 2 : Titre du ticket (Hauteur FIXE) -->
            <!-- 
               h-10 : Force une hauteur de 40px (exactement 2 lignes en text-sm) 
               overflow-hidden : Cache ce qui dépasse
               line-clamp-2 : Ajoute les "..." si c'est trop long
               mb-4 : Pousse le footer vers le bas avec une marge constante
            -->
            <a href="${issueUrl}" target="_blank" 
               class="block h-10 overflow-hidden text-gray-900 font-medium text-sm leading-snug hover:text-blue-600 transition-colors mb-4 line-clamp-2" 
               title="${escapeHtml(issue.fields.summary)}">
                ${escapeHtml(issue.fields.summary)}
            </a>

            <!-- LIGNE 3 : Footer -->
            <!-- mt-auto permet de coller au bas si jamais on change la hauteur de la card, 
                 mais ici c'est surtout le h-10 du dessus qui assure l'alignement -->
            <div class="mt-auto pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                
                <!-- Type -->
                <div class="flex items-center gap-1" title="Type: ${escapeHtml(issueType)}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4" style="color: ${typeColor}">
                        <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a1 1 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                    </svg>
                    <span class="truncate max-w-[80px]">${escapeHtml(issueType)}</span>
                </div>

                <!-- Priorité -->
                <div class="flex items-center gap-1" title="Priorité: ${escapeHtml(priority)}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4" style="color: ${priorityColor}">
                        <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
                    </svg>
                    <span>${escapeHtml(priority)}</span>
                </div>

                <!-- Assigné -->
                <div class="flex items-center gap-1 ml-auto" title="Assigné à: ${escapeHtml(assignee)}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-gray-400">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                    </svg>
                    <span class="truncate max-w-[100px] font-medium text-gray-600">${truncateText(assignee, 15)}</span>
                </div>

            </div>
        </div>
    </div>
  `;

    return col;
  }

  // Couleur du badge selon le statut
  function getStatusColor(status) {
    const s = status.toLowerCase();

    // VERT : Terminé, Résolu, Closed
    if (s.includes('done') || s.includes('terminé') || s.includes('closed') || s.includes('résolu')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    // BLEU : En cours, Progress
    else if (s.includes('progress') || s.includes('cours')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    // VIOLET : Review, Test, Recette
    else if (s.includes('review') || s.includes('test') || s.includes('recette')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    // ROUGE : Bloqué, Rejeté
    else if (s.includes('block') || s.includes('bloqué') || s.includes('cancel')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    // GRIS (Défaut) : À faire, Open, To Do
    else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
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

// 1. Écouter les changements sur les cases à cocher (Event Delegation)
document.addEventListener('change', function (e) {
  if (e.target && e.target.classList.contains('select-ticket-cb')) {
    updateFabState();
  }
});

// 2. Mettre à jour l'état du bouton flottant
function updateFabState() {
  const checkedBoxes = document.querySelectorAll('.select-ticket-cb:checked');
  const fabContainer = document.getElementById('fabContainer');
  const countBadge = document.getElementById('selectedCountBadge');

  if (checkedBoxes.length > 0) {
    fabContainer.style.display = 'block';
    countBadge.textContent = checkedBoxes.length;
  } else {
    fabContainer.style.display = 'none';
  }
}

// 3. Action : Ouvrir les tickets sélectionnés
document.getElementById('btnOpenSelected').addEventListener('click', function () {
  const checkedBoxes = document.querySelectorAll('.select-ticket-cb:checked');

  checkedBoxes.forEach(checkbox => {
    // Ouvre chaque lien dans un nouvel onglet
    // 'active: false' permet d'ouvrir en arrière-plan sans quitter l'extension immédiatement
    chrome.tabs.create({ url: checkbox.value, active: false });
  });
});
