const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('workspace.html', 'utf8');
const script = fs.readFileSync('src/pages/workspace/workspace.js', 'utf8');
const search = fs.readFileSync('src/pages/search/search.js', 'utf8');
const searchHtml = fs.readFileSync('search.html', 'utf8');
const navbar = fs.readFileSync('src/components/navigation/navbar.js', 'utf8');

assert.match(html, /Tickets épinglés/);
assert.match(html, /Tickets récents/);
assert.match(html, /Recherches sauvegardées/);
assert.match(html, /Workspace/);
assert.match(html, /id="workspaceSummary"/);
assert.match(html, /id="workspaceSummary"[^>]*aria-live="polite"/);
assert.match(html, /id="global-navbar"/);
assert.match(html, /data-page="workspace"/);
assert.match(navbar, /ui_jira_search/);
assert.match(navbar, /Jira Quick Search/);
assert.match(navbar, /recap\.html/);
assert.match(navbar, /options\.html/);
assert.match(navbar, /ui_workspace/);
assert.match(script, /chrome\.storage\.local/);
assert.match(script, /ui_no_pinned_issues/);
assert.match(script, /ui_no_saved_searches/);
assert.match(script, /ui_remove_from_history/);
assert.match(script, /ui_unpin/);
assert.match(script, /ui_open_in_jira/);
assert.match(script, /ui_copy_link/);
assert.match(script, /modifiedOn/);
assert.match(script, /lastUsed/);
assert.match(search, /togglePinnedIssue/);
assert.match(search, /addRecentIssue/);
assert.match(search, /saveCurrentSearch/);
assert.match(searchHtml, /navbar\.js/);
assert.match(searchHtml, /workspace-utils\.js/);

console.log('workspace: 10 tests passed');
