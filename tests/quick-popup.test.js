const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const popup = fs.readFileSync('popup.html', 'utf8');
const popupScript = fs.readFileSync('popup.js', 'utf8');
const background = fs.readFileSync('background.js', 'utf8');

assert.equal(manifest.action.default_popup, 'popup.html');
assert.match(popup, /id="quickSearchForm"/);
assert.match(popup, /id="quickSearchInput"/);
assert.match(popup, /id="quickSearchError"/);
assert.match(popup, /vendor\/flowbite\.min\.css/);
assert.doesNotMatch(popup, /global-navbar|navbar\.js/);
assert.match(popupScript, /chrome\.storage\.sync\.get/);
assert.match(popupScript, /search\.html/);
assert.match(popupScript, /q=\$\{encodeURIComponent/);
assert.match(popupScript, /browse/);
assert.match(popupScript, /options\.html/);
assert.doesNotMatch(background, /chrome\.action\.onClicked/);
assert.match(background, /runtime\.getURL\('popup\.html'\)/);

console.log('quick-popup: 9 tests passed');
