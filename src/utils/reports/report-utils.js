const TERMINAL_STATUS_WORDS = ['done', 'closed', 'resolved', 'terminé', 'terminée', 'fermé', 'fermée', 'résolu', 'résolue', 'cancelled', 'annulé', 'annulée'];
var t = (...args) => JiraQuickSearchI18n.t(...args);

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

function generateSummary(report, start, end, activityLabel = t('reportActivityCriteria')) {
  const total = report.involved?.length ?? report.all.length;
  const period = t('reportPeriod', [formatDate(start), formatDate(end)]);
  const first = total === 1 ? t('reportFirstOne', [period, activityLabel]) : t('reportFirstMany', [period, total, activityLabel]);
  const statusCounts = countBy(report.involved || report.all, issue => issue.status);
  const significant = Object.entries(statusCounts).filter(([status]) => !isTerminalStatus(status)).sort((a, b) => b[1] - a[1]);
  const statusSentence = report.completed.length === 0
    ? t('reportNoneCompleted')
    : report.completed.length === 1 ? t('reportCompletedOne') : t('reportCompletedMany', report.completed.length);
  const detail = significant.length
    ? ` ${significant.map(([status, count]) => `${count} ${status.toLowerCase()}`).join(t('reportAnd'))}.`
    : '';
  return `${first} ${statusSentence}${detail}`;
}

function sortTimeline(issues) {
  return deduplicateIssues(issues).sort((a, b) => activityTime(b) - activityTime(a));
}

function generateMarkdownReport(report, start, end, options = {}) {
  const title = options.title ? t('reportNamedTitle', options.title) : t('reportTitle');
  const summary = options.summary || generateSummary(report, start, end);
  const breakdowns = getBreakdowns(report.involved || report.all);
  const lines = [title, '', t('reportPeriodLine', [formatDate(start), formatDate(end)]), '', t('reportOverview'), '', summary, '', t('reportHighlights'), '',
    t('reportInvolved', report.involved?.length ?? report.all.length),
    t('reportCompletedLine', report.completed.length),
    t('reportInProgress', report.inProgress.length),
    t('reportCreated', report.created.length),
    t('reportUpdated', report.updated.length), '', t('reportBreakdown')];
  appendBreakdown(lines, t('reportProject'), breakdowns.project);
  appendBreakdown(lines, t('reportStatus'), breakdowns.status);
  appendBreakdown(lines, t('reportType'), breakdowns.type);
  lines.push('', t('reportIssues'), '', ...formatLinkedIssues(report.involved || report.all, options.baseUrl));
  lines.push('', t('reportTimeline'), '', ...sortTimeline(report.involved || report.all).map(issue => `- ${formatActivityDate(issue)} — ${issue.key} — ${issue.summary || t('ui_no_summary')} (${issue.status || t('ui_status_unavailable')})`));
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
    return `- ${key} — ${issue.summary || t('ui_no_summary')}\n  ${t('reportStatusLine', issue.status || t('ui_unavailable_239'))}\n  ${t('reportLastActivity', formatActivityDate(issue))}`;
  }) : [t('reportNoIssues')];
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
function formatActivityDate(issue) { return issue.updated || issue.created ? new Date(issue.updated || issue.created).toLocaleString(JiraQuickSearchI18n.getDateLocale()) : t('ui_date_unavailable'); }
function formatDate(date) { return new Date(date).toLocaleDateString(JiraQuickSearchI18n.getDateLocale()); }
function plural(value) { return value === 1 ? '' : 's'; }

if (typeof module !== 'undefined') {
  module.exports = { classifyIssues, deduplicateIssues, generateMarkdownReport, generateSummary, getBreakdowns, isTerminalStatus, sortTimeline };
}
