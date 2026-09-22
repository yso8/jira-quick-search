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
          <span class="global-navbar__logo" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
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
