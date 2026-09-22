(() => {
  const pageAccents = {
    search: '#1A56DB',
    workspace: '#F97316',
    recap: '#6D28D9',
    options: '#1A56DB',
    popup: '#1A56DB'
  };

  const links = [
    { page: 'search', label: 'Recherche Jira', href: 'search.html' },
    { page: 'workspace', label: 'Workspace', href: 'workspace.html' },
    { page: 'recap', label: 'Récapitulatif', href: 'recap.html' },
    { page: 'options', label: 'Paramètres', href: 'options.html' }
  ];

  function renderNavbar() {
    const navbar = document.getElementById('global-navbar');
    if (!navbar) return;

    const page = document.body.dataset.page || 'search';
    const activePage = page === 'popup' ? 'search' : page;
    const accent = pageAccents[page] || pageAccents.search;

    navbar.className = 'global-navbar';
    navbar.style.setProperty('--navbar-accent', accent);
    navbar.innerHTML = `
      <div class="global-navbar__inner">
        <a href="search.html" class="global-navbar__brand" aria-label="Jira Quick Search — Recherche Jira">
          <img src="src/assets/icons/jira-quick-search.png" alt="" class="global-navbar__logo" aria-hidden="true">
          <span>Jira Quick Search</span>
        </a>
        <div class="global-navbar__links" aria-label="Navigation principale">
          ${links.map((link) => `
            <a href="${link.href}" data-page="${link.page}" class="global-navbar__link${link.page === activePage ? ' is-active' : ''}">${link.label}</a>
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
