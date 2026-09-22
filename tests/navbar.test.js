const assert = require('node:assert/strict');
const fs = require('node:fs');

const pages = ['search', 'workspace', 'recap', 'options', 'popup'];
for (const page of pages) {
  const html = fs.readFileSync(`${page}.html`, 'utf8');
  assert.match(html, /id="global-navbar"/);
  assert.match(html, /navbar\.js/);
  assert.match(html, new RegExp(`data-page="${page === 'search' ? 'search' : page}"`));
}

const navbar = fs.readFileSync('navbar.js', 'utf8');
assert.match(navbar, /Jira Quick Search/);
assert.match(navbar, /Recherche Jira/);
assert.match(navbar, /Workspace/);
assert.match(navbar, /Récapitulatif/);
assert.match(navbar, /Paramètres/);
assert.match(navbar, /1A56DB/);
assert.match(navbar, /F97316/);
assert.match(navbar, /6D28D9/);

console.log('navbar: 10 tests passed');
