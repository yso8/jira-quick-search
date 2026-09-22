const TERMINAL_STATUS_WORDS = ['done', 'closed', 'resolved', 'terminé', 'terminée', 'fermé', 'fermée', 'résolu', 'résolue', 'cancelled', 'annulé', 'annulée'];

function isTerminalStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return TERMINAL_STATUS_WORDS.some(word => normalized.includes(word));
}

function deduplicateIssues(issues) {
  return [...new Map(issues.filter(issue => issue && issue.key).map(issue => [issue.key, issue])).values()];
}

function classifyIssues(issues, start, end) {
  const all = deduplicateIssues(issues);
  const updated = all.filter(issue => isInPeriod(issue.updated, start, end));
  const created = all.filter(issue => isInPeriod(issue.created, start, end));
  const involved = all.filter(issue => updated.includes(issue) || created.includes(issue));
  const completed = involved.filter(issue => isTerminalStatus(issue.status));
  const inProgress = involved.filter(issue => !isTerminalStatus(issue.status));
  return { all, involved, completed, inProgress, created, updated };
}

function getBreakdowns(issues) {
  const all = deduplicateIssues(issues);
  return {
    project: countBy(all, issue => issue.project),
    status: countBy(all, issue => issue.status),
    type: countBy(all, issue => issue.type)
  };
}

function generateSummary(report, start, end, activityLabel = 'aux critères d’activité sélectionnés') {
  const total = report.involved?.length ?? report.all.length;
  const period = `Sur la période du ${formatDate(start)} au ${formatDate(end)},`;
  const first = `${period} ${total} ticket${plural(total)} correspondent ${activityLabel}.`;
  const statusCounts = countBy(report.involved || report.all, issue => issue.status);
  const significant = Object.entries(statusCounts).filter(([status]) => !isTerminalStatus(status)).sort((a, b) => b[1] - a[1]);
  const statusSentence = report.completed.length === 0
    ? 'Aucun ticket n’est terminé.'
    : `${report.completed.length} ticket${plural(report.completed.length)} ${report.completed.length === 1 ? 'est' : 'sont'} terminé${report.completed.length === 1 ? '' : 's'}.`;
  const detail = significant.length
    ? ` ${significant.map(([status, count]) => `${count} ${status.toLowerCase()}`).join(' et ')}.`
    : '';
  return `${first} ${statusSentence}${detail}`;
}

function sortTimeline(issues) {
  return deduplicateIssues(issues).sort((a, b) => activityTime(b) - activityTime(a));
}

function generateMarkdownReport(report, start, end, options = {}) {
  const title = options.title ? `# Bilan Jira — ${options.title}` : '# Bilan d’activité Jira';
  const summary = options.summary || generateSummary(report, start, end);
  const breakdowns = getBreakdowns(report.involved || report.all);
  const lines = [title, '', `Période : ${formatDate(start)} – ${formatDate(end)}`, '', '## Synthèse', '', summary, '', '## Points clés', '',
    `- ${report.involved?.length ?? report.all.length} ticket(s) concerné(s)`,
    `- ${report.completed.length} ticket(s) terminé(s)`,
    `- ${report.inProgress.length} ticket(s) non terminé(s)`,
    `- ${report.created.length} ticket(s) créé(s)`,
    `- ${report.updated.length} ticket(s) mis à jour`, '', '## Répartition'];
  appendBreakdown(lines, 'Par projet', breakdowns.project);
  appendBreakdown(lines, 'Par statut', breakdowns.status);
  appendBreakdown(lines, 'Par type', breakdowns.type);
  lines.push('', '## Tickets concernés', '', ...formatLinkedIssues(report.involved || report.all, options.baseUrl));
  lines.push('', '## Timeline', '', ...sortTimeline(report.involved || report.all).map(issue => `- ${formatActivityDate(issue)} — ${issue.key} — ${issue.summary || 'Sans résumé'} (${issue.status || 'Statut indisponible'})`));
  return lines.join('\n');
}

function appendBreakdown(lines, title, breakdown) {
  const entries = Object.entries(breakdown);
  if (!entries.length) return;
  lines.push('', `### ${title}`, '', ...entries.sort((a, b) => b[1] - a[1]).map(([label, count]) => `- ${label}: ${count}`));
}

function formatLinkedIssues(issues, baseUrl = '') {
  return issues.length ? issues.map(issue => {
    const key = baseUrl ? `[${issue.key}](${baseUrl}/browse/${issue.key})` : issue.key;
    return `- ${key} — ${issue.summary || 'Sans résumé'}\n  - Statut : ${issue.status || 'Indisponible'}\n  - Dernière activité : ${formatActivityDate(issue)}`;
  }) : ['- Aucun ticket'];
}

function countBy(issues, selector) {
  return issues.reduce((counts, issue) => {
    const value = selector(issue);
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function isInPeriod(value, start, end) {
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date >= start && date <= end;
}

function activityTime(issue) { return new Date(issue.updated || issue.created || 0).valueOf(); }
function formatActivityDate(issue) { return issue.updated || issue.created ? new Date(issue.updated || issue.created).toLocaleString('fr-FR') : 'Date indisponible'; }
function formatDate(date) { return new Date(date).toLocaleDateString('fr-FR'); }
function plural(value) { return value === 1 ? '' : 's'; }

if (typeof module !== 'undefined') {
  module.exports = { classifyIssues, deduplicateIssues, generateMarkdownReport, generateSummary, getBreakdowns, isTerminalStatus, sortTimeline };
}
