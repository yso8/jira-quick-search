const FEEDBACK_ISSUE_URL = 'https://github.com/yso8/jira-quick-search/issues/new';
const FEEDBACK_TYPES = new Set(['bug', 'feature', 'question']);

function validateFeedback({ type, title, description } = {}) {
  if (!FEEDBACK_TYPES.has(type)) return { valid: false, message: 'Sélectionnez un type de feedback.' };
  if (!String(title || '').trim()) return { valid: false, message: 'Ajoutez un titre à votre feedback.' };
  if (!String(description || '').trim()) return { valid: false, message: 'Décrivez brièvement le problème avant de continuer.' };
  return { valid: true };
}

function buildTechnicalInfo({ version, browser, platform, manifestVersion, instanceType, diagnosticStatus } = {}) {
  return [
    `- Version de Jira Quick Search : ${version || 'inconnue'}`,
    `- Navigateur : ${browser || 'inconnu'}`,
    `- Système : ${platform || 'inconnu'}`,
    `- Version du manifest : ${manifestVersion || 'inconnue'}`,
    `- Type d’instance Jira : ${instanceType || 'non déterminé'}`,
    `- État du diagnostic : ${diagnosticStatus || 'non exécuté'}`
  ].join('\n');
}

function buildFeedbackBody({ type, description, reproducible = false, includeTechnical = false, technicalInfo = '' } = {}) {
  let body;
  if (type === 'bug') {
    body = `## Description\n\n${description.trim()}\n\n## Étapes pour reproduire\n\n1.\n2.\n3.\n\n## Résultat attendu\n\n<!-- Que deviez-vous obtenir ? -->\n\n## Résultat obtenu\n\n<!-- Que s’est-il réellement passé ? -->`;
    body += `\n\n- Reproductible : ${reproducible ? 'Oui' : 'Non précisé'}`;
  } else if (type === 'feature') {
    body = `## Besoin\n\n${description.trim()}\n\n## Proposition\n\n<!-- Décrivez la fonctionnalité souhaitée. -->\n\n## Contexte d’utilisation\n\n<!-- Dans quel cas cette fonctionnalité serait-elle utile ? -->`;
  } else {
    body = `## Question\n\n${description.trim()}`;
  }

  if (includeTechnical && technicalInfo) body += `\n\n## Informations techniques\n\n${technicalInfo}`;
  return body;
}

function buildGithubIssueUrl({ type, title, body }) {
  const url = new URL(FEEDBACK_ISSUE_URL);
  url.searchParams.set('title', title.trim());
  url.searchParams.set('body', body);
  return url.toString();
}

if (typeof module !== 'undefined') {
  module.exports = { FEEDBACK_ISSUE_URL, validateFeedback, buildTechnicalInfo, buildFeedbackBody, buildGithubIssueUrl };
}
