// Variables globales
let config = null;
let allUsers = [];
let currentResults = [];

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  // Éléments du DOM
  const userSelect = document.getElementById('userSelect');
  const dateRange = document.getElementById('dateRange');
  const generateBtn = document.getElementById('generateBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const initialState = document.getElementById('initialState');
  const resultsContainer = document.getElementById('resultsContainer');
  const errorMessage = document.getElementById('errorMessage');
  const exportButtons = document.getElementById('exportButtons');

  // Vérifier la configuration
  config = await loadJiraConfig();

  if (!config.jiraUrl || !config.jiraEmail || !config.jiraToken) {
    showError('⚠️ Configuration manquante. Veuillez configurer l\'extension.', true);
    return;
  }

  // Charger la liste des users
  await loadUsers();

  // Event listeners
  generateBtn.addEventListener('click', generateRecap);
  exportCsvBtn.addEventListener('click', exportToCSV);
  copyTextBtn.addEventListener('click', copyToText);
});

// Charger la liste des users Jira
async function loadUsers() {
  try {
    const response = await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/users/search?accountType=atlassian&maxResults=200`);

    const users = await response.json();
    allUsers = users
      .filter(user => user.active && user.accountType === 'atlassian')
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));


    // Remplir le dropdown
    const userSelect = document.getElementById('userSelect');
    allUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user.accountId;
      option.textContent = user.displayName;
      userSelect.appendChild(option);
    });

  } catch (error) {
    await debugLog('erreur chargement utilisateurs', { message: error.message, stack: error.stack });
    showError(`Erreur lors du chargement des utilisateurs: ${error.message}`);
  }
}

// Générer le récapitulatif
// Calcule les dates de début/fin selon la période sélectionnée
function getPeriodDates(period) {
  const now = new Date();

  const getMonday = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return date;
  };

  const endOfDay = (d) => {
    const date = new Date(d);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  switch (period) {
    case 'this_week': {
      return { start: getMonday(now), end: endOfDay(now) };
    }
    case 'last_week': {
      const start = getMonday(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case 'last_2_weeks': {
      const start = getMonday(now);
      start.setDate(start.getDate() - 7);
      return { start, end: endOfDay(now) };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: endOfDay(now) };
    }
    default:
      return { start: getMonday(now), end: endOfDay(now) };
  }
}

async function generateRecap() {
  const userSelect = document.getElementById('userSelect');
  const dateRange = document.getElementById('dateRange');

  const assigneeId = userSelect.value;
  const { start, end } = getPeriodDates(dateRange.value);

  hideAllStates();
  document.getElementById('loadingSpinner').style.display = 'block';

  try {
    const results = await fetchWeeklyActivities(assigneeId, start, end);
    currentResults = results;

    if (results.length === 0) {
      showError('Aucun ticket trouvé pour cette période.');
      return;
    }

    displayResults(results);
    displayStats(results);
    document.getElementById('exportButtons').classList.remove('hidden');

  } catch (error) {
    await debugLog('erreur génération récapitulatif', { message: error.message, stack: error.stack });
    showError(`Erreur: ${error.message}`);
  } finally {
    document.getElementById('loadingSpinner').style.display = 'none';
  }
}

// Récupérer les tickets modifiés dans la période
async function fetchWeeklyActivities(assigneeId, startDate, endDate) {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    let jql = `updated >= "${startStr}" AND updated <= "${endStr}"`;
    if (assigneeId) {
      jql += ` AND assignee = "${assigneeId}"`;
    }
    jql += ` ORDER BY updated DESC`;

    const response = await jiraRequest(config, `/rest/api/${JIRA_API_VERSION}/search/jql`, {
      method: 'POST',
      body: JSON.stringify({
        jql,
        maxResults: 100,
        fields: ['key', 'summary', 'status', 'assignee', 'updated', 'comment']
      })
    });

    const data = await response.json();

    const enrichedIssues = data.issues.map(issue => enrichIssueData(issue, startDate));

    return enrichedIssues;

  } catch (error) {
    await debugLog('erreur récupération activités', { message: error.message, stack: error.stack });
    throw error;
  }
}

// Enrichir les données d'un ticket (synchrone, changelog déjà embarqué dans la réponse)
function enrichIssueData(issue, startDate) {
  const assigneeAccountId = issue.fields.assignee ? issue.fields.assignee.accountId : null;
  let lastModifiedBy = 'Non disponible';

  const histories = issue.changelog ? issue.changelog.histories : [];
  const changeByAssignee = histories.find(
    change => assigneeAccountId &&
      change.author.accountId === assigneeAccountId &&
      new Date(change.created) >= startDate
  );
  if (changeByAssignee) {
    lastModifiedBy = changeByAssignee.author.displayName;
  }

  let commentsCount = 0;
  if (issue.fields.comment && issue.fields.comment.comments) {
    commentsCount = issue.fields.comment.comments.filter(
      comment => new Date(comment.created) >= startDate
    ).length;
  }

  return {
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    updated: issue.fields.updated,
    lastModifiedBy,
    commentsCount,
    assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Non assigné'
  };
}

// Afficher les résultats dans le tableau
function displayResults(issues) {
  const tableBody = document.getElementById('resultsTableBody');
  tableBody.innerHTML = '';

  issues.forEach(issue => {
    const row = document.createElement('tr');
    row.className = 'bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors';

    const issueUrl = `${config.jiraUrl}/browse/${issue.key}`;
    const formattedDate = new Date(issue.updated).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusColor = getStatusColor(issue.status);

    row.innerHTML = `
      <td class="px-6 py-4 font-medium text-blue-600">
        <div class="flex items-center gap-2">
          <a href="${issueUrl}" target="_blank" class="hover:underline">${escapeHtml(issue.key)}</a>
          <button class="copy-key-btn text-gray-400 hover:text-gray-700 transition-colors" data-key="${issue.key}" title="Copier la clé">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
        </div>
      </td>
      <td class="px-6 py-4 text-gray-900">
        <div class="flex items-center gap-2">
          <span>${escapeHtml(truncateText(issue.summary, 60))}</span>
          <button class="copy-summary-btn flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors" data-summary="${issue.summary.replace(/"/g, '&quot;')}" title="Copier le résumé">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
        </div>
      </td>
      <td class="px-6 py-4 text-gray-700">
        ${escapeHtml(issue.lastModifiedBy)}
      </td>
      <td class="px-6 py-4 text-gray-500">
        ${formattedDate}
      </td>
      <td class="px-6 py-4 text-center">
        <span class="inline-flex items-center justify-center w-8 h-8 text-xs font-semibold ${issue.commentsCount > 0 ? 'text-blue-800 bg-blue-100' : 'text-gray-500 bg-gray-100'} rounded-full">
          ${escapeHtml(issue.commentsCount)}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="${statusColor} text-xs font-medium px-2.5 py-0.5 rounded">
          ${escapeHtml(issue.status)}
        </span>
      </td>
    `;

    // Copie de la clé du ticket
    row.querySelector('.copy-key-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(issue.key).then(() => {
        const btn = e.currentTarget;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
        setTimeout(() => {
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
        }, 1500);
      });
    });

    // Copie du résumé
    row.querySelector('.copy-summary-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(issue.summary).then(() => {
        const btn = e.currentTarget;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
        setTimeout(() => {
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
        }, 1500);
      });
    });

    // Événement click pour ouvrir le ticket
    row.addEventListener('click', () => {
      window.open(issueUrl, '_blank');
    });

    tableBody.appendChild(row);
  });

  document.getElementById('resultsContainer').style.display = 'block';
}

// Afficher les statistiques
function displayStats(issues) {
  // Total tickets
  document.getElementById('totalTickets').textContent = issues.length;

  // Répartition par personne
  const userCounts = {};
  issues.forEach(issue => {
    const user = issue.lastModifiedBy;
    userCounts[user] = (userCounts[user] || 0) + 1;
  });

  const userStats = document.getElementById('userStats');
  userStats.innerHTML = '';

  // Trier par nombre de tickets (décroissant)
  const sortedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);

  sortedUsers.slice(0, 5).forEach(([user, count]) => {
    const percentage = ((count / issues.length) * 100).toFixed(0);
    userStats.innerHTML += `
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-700 truncate max-w-[150px]" title="${escapeHtml(user)}">${escapeHtml(user)}</span>
        <div class="flex items-center gap-2">
          <div class="w-24 bg-gray-200 rounded-full h-2">
            <div class="bg-green-600 h-2 rounded-full" style="width: ${percentage}%"></div>
          </div>
          <span class="text-gray-600 font-medium w-12 text-right">${count}</span>
        </div>
      </div>
    `;
  });

  // Tickets par statut
  const statusCounts = {};
  issues.forEach(issue => {
    const status = issue.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusStats = document.getElementById('statusStats');
  statusStats.innerHTML = '';

  // Trier par nombre de tickets (décroissant)
  const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  sortedStatuses.forEach(([status, count]) => {
    const percentage = ((count / issues.length) * 100).toFixed(0);
    const statusColor = getStatusColor(status);
    statusStats.innerHTML += `
      <div class="flex items-center justify-between text-sm">
        <span class="${statusColor} text-xs font-medium px-2 py-0.5 rounded truncate max-w-[120px]" title="${escapeHtml(status)}">${escapeHtml(status)}</span>
        <div class="flex items-center gap-2">
          <div class="w-20 bg-gray-200 rounded-full h-2">
            <div class="bg-purple-600 h-2 rounded-full" style="width: ${percentage}%"></div>
          </div>
          <span class="text-gray-600 font-medium w-8 text-right">${count}</span>
        </div>
      </div>
    `;
  });
}

// Exporter en CSV
function exportToCSV() {
  if (currentResults.length === 0) {
    showError('Aucune donnée à exporter');
    return;
  }

  // Headers CSV
  const headers = ['Ticket', 'Résumé', 'Modifié par', 'Date', 'Commentaires', 'Statut'];

  // Lignes de données
  const rows = currentResults.map(issue => {
    const date = new Date(issue.updated).toLocaleDateString('fr-FR');
    return [
      issue.key,
      `"${issue.summary.replace(/"/g, '""')}"`, // Échapper les guillemets
      issue.lastModifiedBy,
      date,
      issue.commentsCount,
      issue.status
    ].join(',');
  });

  // Combiner headers et rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Créer un blob et télécharger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `recap-jira-${today}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('✅ CSV exporté avec succès !');
}

// Copier en texte (format markdown)
async function copyToText() {
  if (currentResults.length === 0) {
    showError('Aucune donnée à copier');
    return;
  }

  const dateRangeEl = document.getElementById('dateRange');
  const periodLabel = dateRangeEl.options[dateRangeEl.selectedIndex].text;
  const userSelect = document.getElementById('userSelect');
  const selectedUser = userSelect.options[userSelect.selectedIndex].text;

  // En-tête
  let text = `# Récapitulatif Jira - ${periodLabel}\n`;
  if (userSelect.value) {
    text += `**Personne:** ${selectedUser}\n`;
  }
  text += `**Total tickets:** ${currentResults.length}\n\n`;

  // Tableau markdown
  text += `| Ticket | Résumé | Modifié par | Date | Commentaires | Statut |\n`;
  text += `|--------|---------|-------------|------|--------------|--------|\n`;

  currentResults.forEach(issue => {
    const date = new Date(issue.updated).toLocaleDateString('fr-FR');
    text += `| ${issue.key} | ${issue.summary.substring(0, 50)}... | ${issue.lastModifiedBy} | ${date} | ${issue.commentsCount} | ${issue.status} |\n`;
  });

  // Copier dans le presse-papiers
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Texte copié dans le presse-papiers !');
  } catch (error) {
    await debugLog('erreur copie', { message: error.message, stack: error.stack });
    showError('Erreur lors de la copie');
  }
}

// Utilitaires

function getStatusColor(status) {
  const s = status.toLowerCase();

  if (s.includes('done') || s.includes('terminé') || s.includes('closed') || s.includes('résolu')) {
    return 'bg-green-100 text-green-800 border-green-200';
  } else if (s.includes('progress') || s.includes('cours')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (s.includes('review') || s.includes('test') || s.includes('recette')) {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  } else if (s.includes('block') || s.includes('bloqué') || s.includes('cancel')) {
    return 'bg-red-100 text-red-800 border-red-200';
  } else {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function truncateText(text, maxLength) {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function hideAllStates() {
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('initialState').style.display = 'none';
  document.getElementById('resultsContainer').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'none';
}

function showError(message, withSettingsLink = false) {
  hideAllStates();
  const errorEl = document.getElementById('errorMessage');
  errorEl.style.display = 'block';

  let html = `
    <div class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path fill-rule="evenodd"
          d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
          clip-rule="evenodd" />
      </svg>
      <span class="font-medium">Erreur :</span>
      <span class="ml-1">${message}</span>
    </div>
  `;

  if (withSettingsLink) {
    html += `
      <a href="options.html" class="mt-3 inline-flex items-center text-sm text-red-800 hover:text-red-900 font-medium">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        Configurer l'extension
      </a>
    `;
  }

  errorEl.innerHTML = html;
}

function showToast(message) {
  // Créer un toast temporaire
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
      <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
    </svg>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
