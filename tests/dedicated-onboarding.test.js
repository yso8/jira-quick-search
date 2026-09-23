const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('onboarding.html', 'utf8');
const script = fs.readFileSync('src/pages/onboarding/onboarding.js', 'utf8');
const background = fs.readFileSync('background.js', 'utf8');
const options = fs.readFileSync('options.html', 'utf8');
const optionsScript = fs.readFileSync('src/pages/settings/options.js', 'utf8');

assert.match(html, /Bienvenue sur Jira Quick Search/);
assert.match(html, /Connectez votre espace Jira/);
assert.match(html, /Tout est prêt/);
assert.match(html, /id="startBtn"/);
assert.match(html, /id="testConnectionBtn"/);
assert.match(html, /id="continueBtn"/);
assert.match(html, /id="skipBtn"/);
assert.match(html, /prefers-reduced-motion/);
assert.match(html, /jira-quick-search\.png/);
assert.match(html, /id="onboardingJiraEmail" type="email"[^>]*placeholder="vous@entreprise\.com"/);
assert.match(html, /id="onboardingJiraToken" type="password"[^>]*placeholder="Collez votre token API"/);
assert.match(html, /id="testConnectionBtn"[\s\S]*Vos informations restent stockées localement/);
assert.match(script, /onboardingCompleted/);
assert.match(script, /chrome\.storage\.local\.set/);
assert.match(script, /jiraRequest/);
assert.match(script, /Connexion en cours/);
assert.match(script, /Jira est connecté/);
assert.match(script, /confetti/);
assert.match(background, /onboarding\.html/);
assert.match(options, /Revoir l’introduction/);
assert.match(optionsScript, /onboarding\.html/);

console.log('dedicated-onboarding: 19 tests passed');
