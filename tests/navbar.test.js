const assert = require('node:assert/strict');
const fs = require('node:fs');

const pages = ['search', 'workspace', 'recap', 'options'];
for (const page of pages) {
  const html = fs.readFileSync(`${page}.html`, 'utf8');
  assert.match(html, /id="global-navbar"/);
  assert.match(html, /navbar\.js/);
  assert.match(html, new RegExp(`data-page="${page === 'search' ? 'search' : page}"`));
}
const popup = fs.readFileSync('popup.html', 'utf8');
assert.doesNotMatch(popup, /id="global-navbar"|navbar\.js/);

const navbar = fs.readFileSync('navbar.js', 'utf8');
const styles = fs.readFileSync('navbar.css', 'utf8');
assert.match(navbar, /Jira Quick Search/);
assert.match(navbar, /Recherche Jira/);
assert.match(navbar, /Workspace/);
assert.match(navbar, /Récapitulatif/);
assert.match(navbar, /Paramètres/);
assert.match(navbar, /1A56DB/);
assert.match(navbar, /F97316/);
assert.match(navbar, /6D28D9/);
assert.match(navbar, /icons\/jira-quick-search\.png/);
assert.match(navbar, /<img src="icons\/jira-quick-search\.png"[^>]*class="global-navbar__logo"/);
assert.doesNotMatch(navbar, /<span class="global-navbar__logo"/);
assert.match(styles, /\.global-navbar__link:focus-visible/);
assert.match(styles, /\.global-navbar__logo[\s\S]*object-fit:\s*contain/);
assert.match(styles, /@media \(max-width: 640px\)/);

console.log('navbar: 10 tests passed');
