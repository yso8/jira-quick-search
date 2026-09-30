document.addEventListener('DOMContentLoaded', async () => {
  const locale = await JiraQuickSearchI18n.initI18n();
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US';
  const { t, applyTranslations } = JiraQuickSearchI18n;
  applyTranslations(document);
  document.documentElement.lang = locale;
  const data = await chrome.storage.local.get({ pinnedIssues: [], recentIssues: [], savedSearches: [] });
  document.getElementById('workspaceSummary').textContent = t('workspaceSummary', [data.recentIssues.length, data.pinnedIssues.length, data.savedSearches.length]);
  renderIssues('pinnedIssues', data.pinnedIssues, t('ui_no_pinned_issues'), t('ui_pin_important_issues_from_search_results'), 'pinned');
  renderIssues('recentIssues', data.recentIssues, t('ui_no_recent_issues'), t('ui_open_an_issue_from_search_results_to_find_it_here'), 'recent');
  document.getElementById('recentHeading').classList.toggle('hidden', data.recentIssues.length === 0);
  renderSearches(data.savedSearches);

  function renderIssues(id, issues, emptyTitle, emptyText, kind) {
    const container = document.getElementById(id);
    if (!issues.length) {
      container.innerHTML = `<div class="rounded-lg bg-gray-50 px-4 py-3 text-sm"><p class="font-medium text-gray-700">${emptyTitle}</p><p class="mt-1 text-gray-500">${emptyText}</p><a href="search.html" class="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline">${t('ui_search_for_an_issue_244')}</a></div>`;
      return;
    }
    container.innerHTML = issues.map(issue => {
      const removeLabel = kind === 'pinned' ? t('ui_unpin') : t('ui_remove_from_history');
      return `<article class="workspace-issue group flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition hover:border-blue-300 hover:bg-blue-50" data-url="${escapeAttribute(issue.url)}">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${kind === 'pinned' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}" aria-hidden="true">${kind === 'pinned' ? '★' : '•'}</span>
        <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><a title="${t('ui_open_in_jira')}" class="font-semibold text-blue-700 hover:underline" target="_blank" href="${escapeAttribute(issue.url)}">${escapeHtml(issue.key)}</a><span class="truncate text-xs text-gray-500">${escapeHtml(issue.status || t('ui_status_unavailable'))}</span></div><p class="truncate text-sm text-gray-800" title="${escapeAttribute(issue.summary || '')}">${escapeHtml(issue.summary || t('ui_summary_unavailable'))}</p><p class="text-xs text-gray-500">${issue.priority ? `${escapeHtml(issue.priority)} · ` : ''}${formatModifiedDate(issue.updated)}</p></div>
        <div class="flex shrink-0 items-center gap-2"><button data-copy-url="${escapeAttribute(issue.url)}" class="text-xs text-gray-500 hover:text-blue-700" title="${t('ui_copy_link')}">${t('ui_copy')}</button><button data-remove-kind="${kind}" data-id="${escapeAttribute(issue.key)}" class="text-xs text-gray-500 hover:text-red-600">${removeLabel}</button></div>
      </article>`;
    }).join('');
  }

  function renderSearches(searches) {
    const container = document.getElementById('savedSearches');
    if (!searches.length) {
      container.innerHTML = `<div class="rounded-lg bg-gray-50 px-4 py-3 text-sm"><p class="font-medium text-gray-700">${t('ui_no_saved_searches')}</p><p class="mt-1 text-gray-500">${t('ui_run_a_search_and_save_it_to_find_it_here')}</p><a href="search.html" class="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline">${t('ui_new_search')}</a></div>`;
      return;
    }
    container.innerHTML = searches.map(search => `<article class="rounded-lg border border-gray-200 px-3 py-2.5"><p class="font-medium text-gray-900">${escapeHtml(search.name)}</p><p class="mt-1 truncate text-xs text-gray-500" title="${escapeAttribute(search.query || search.jql || '')}">${escapeHtml(search.query || search.jql || t('ui_query_unavailable'))}</p><p class="mt-1 text-xs text-gray-400">${t('lastUsed', formatDate(search.lastUsedAt))}</p><div class="mt-2 flex gap-3"><a class="text-xs font-medium text-blue-700 hover:underline" href="search.html?q=${encodeURIComponent(search.query || '')}">${t('ui_run_again')}</a><button data-remove-search="${escapeAttribute(search.id)}" class="text-xs text-gray-500 hover:text-red-600">${t('ui_delete')}</button></div></article>`).join('');
  }

  document.body.addEventListener('click', async event => {
    const issueRow = event.target.closest('.workspace-issue');
    const removeButton = event.target.closest('[data-remove-kind]');
    const copyButton = event.target.closest('[data-copy-url]');
    const searchButton = event.target.closest('[data-remove-search]');
    if (removeButton) {
      event.stopPropagation();
      const storageKey = removeButton.dataset.removeKind === 'pinned' ? 'pinnedIssues' : 'recentIssues';
      const current = await chrome.storage.local.get({ [storageKey]: [] });
      await chrome.storage.local.set({ [storageKey]: removeById(current[storageKey], removeButton.dataset.id) });
      location.reload();
    } else if (copyButton) {
      event.stopPropagation();
      await navigator.clipboard.writeText(copyButton.dataset.copyUrl);
    } else if (searchButton) {
      event.stopPropagation();
      const current = await chrome.storage.local.get({ savedSearches: [] });
      await chrome.storage.local.set({ savedSearches: removeById(current.savedSearches, searchButton.dataset.removeSearch) });
      location.reload();
    } else if (issueRow && issueRow.dataset.url && !event.target.closest('a')) {
      window.open(issueRow.dataset.url, '_blank');
    }
  });

  function formatDate(value) { return value ? new Date(value).toLocaleDateString(dateLocale) : t('ui_date_unavailable'); }
  function formatModifiedDate(value) { return value ? t('modifiedOn', formatDate(value)) : t('ui_modification_unavailable'); }
  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function escapeAttribute(value) { return escapeHtml(value); }
});
