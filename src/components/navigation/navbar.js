(() => {
  const pageAccents = {
    search: '#1A56DB',
    workspace: '#F97316',
    recap: '#6D28D9',
    options: '#1A56DB',
    popup: '#1A56DB'
  };

  const links = [
    { page: 'search', label: 'ui_jira_search', href: 'search.html' },
    { page: 'workspace', label: 'ui_workspace', href: 'workspace.html' },
    { page: 'recap', label: 'ui_summary_152', href: 'recap.html' },
    { page: 'options', label: 'settings', href: 'options.html' }
  ];

  async function renderNavbar() {
    const navbar = document.getElementById('global-navbar');
    if (!navbar) return;
    await JiraQuickSearchI18n.initI18n();
    const { t } = JiraQuickSearchI18n;

    const page = document.body.dataset.page || 'search';
    const activePage = page === 'popup' ? 'search' : page;
    const accent = pageAccents[page] || pageAccents.search;

    navbar.className = 'global-navbar';
    navbar.style.setProperty('--navbar-accent', accent);
    navbar.innerHTML = `
      <div class="global-navbar__inner">
        <a href="search.html" class="global-navbar__brand" aria-label="${t('ui_jira_quick_search_jira_search')}">
          <img src="src/assets/icons/jira-quick-search.png" alt="" class="global-navbar__logo" aria-hidden="true">
          <span>Jira Quick Search</span>
        </a>
        <div class="global-navbar__links" aria-label="${t('ui_main_navigation')}">
          ${links.map((link) => `
            <a href="${link.href}" data-page="${link.page}" class="global-navbar__link${link.page === activePage ? ' is-active' : ''}">${t(link.label)}</a>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavbar, { once: true });
  } else {
    renderNavbar();
  }
})();
