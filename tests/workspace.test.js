const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('workspace.html', 'utf8');
const script = fs.readFileSync('workspace.js', 'utf8');
const search = fs.readFileSync('search.js', 'utf8');
const searchHtml = fs.readFileSync('search.html', 'utf8');
const navbar = fs.readFileSync('navbar.js', 'utf8');

assert.match(html, /Tickets épinglés/);
assert.match(html, /Tickets récents/);
assert.match(html, /Recherches sauvegardées/);
assert.match(html, /Workspace/);
assert.match(html, /id="workspaceSummary"/);
assert.match(html, /id="global-navbar"/);
assert.match(html, /data-page="workspace"/);
assert.match(navbar, /Recherche Jira/);
assert.match(navbar, /Jira Quick Search/);
assert.match(navbar, /recap\.html/);
assert.match(navbar, /options\.html/);
assert.match(navbar, /Workspace/);
assert.match(script, /chrome\.storage\.local/);
assert.match(script, /Aucun ticket épinglé/);
assert.match(script, /Aucune recherche sauvegardée/);
assert.match(script, /Retirer de l’historique/);
assert.match(script, /Désépingler/);
assert.match(script, /Ouvrir dans Jira/);
assert.match(script, /Copier le lien/);
assert.match(script, /Modifié le/);
assert.match(script, /Dernière utilisation/);
assert.match(search, /togglePinnedIssue/);
assert.match(search, /addRecentIssue/);
assert.match(search, /saveCurrentSearch/);
assert.match(searchHtml, /navbar\.js/);
assert.match(searchHtml, /workspace-utils\.js/);

console.log('workspace: 10 tests passed');
