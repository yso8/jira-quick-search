const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('search.html', 'utf8');
const api = fs.readFileSync('jira-api.js', 'utf8');
const search = fs.readFileSync('search.js', 'utf8');

assert.match(html, /id="filterControls"/);
assert.match(html, /id="clearFiltersBtn"/);
assert.match(api, /fetchFilterMetadata/);
assert.match(api, /loadCustomSelectFilters/);
assert.match(api, /user\.accountType === 'atlassian'/);
assert.match(search, /buildFilterJql/);
assert.match(search, /<select id="filter-/);
assert.match(search, /data-filter-id/);

console.log('extension-filters: 6 tests passed');
