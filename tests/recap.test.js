const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('recap.html', 'utf8');

assert.match(html, /id="userSelect"/);
assert.match(html, /id="dateRange"/);
assert.match(html, /id="customPeriod"/);
assert.match(html, /id="generateBtn"/);
assert.match(html, /id="ruleMatchMode"/);
assert.match(html, /class="[^"]*activity-rule/);
assert.match(html, /id="reportSummary"/);
assert.match(html, /id="reportSummary"[^>]*aria-live="polite"/);
assert.match(html, /id="reportTimeline"/);
assert.match(html, /id="resultsTableBody"/);
assert.match(html, /id="exportCsvBtn"/);
assert.match(html, /id="copyTextBtn"/);
assert.match(html, /id="global-navbar"/);
assert.match(html, /data-page="recap"/);

console.log('recap: 13 tests passed');
