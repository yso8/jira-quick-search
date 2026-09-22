function escapeJqlValue(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFilterJql(query, selections, filters) {
  const clauses = [];
  const trimmedQuery = String(query || '').trim();

  if (trimmedQuery) {
    const value = escapeJqlValue(trimmedQuery);
    clauses.push(`(text ~ "${value}*" OR summary ~ "${value}*" OR description ~ "${value}*")`);
  }

  filters.forEach(filter => {
    const value = selections[filter.id];
    if (value !== undefined && value !== null && value !== '') {
      clauses.push(`${filter.jqlField} = "${escapeJqlValue(value)}"`);
    }
  });

  return `${clauses.join(' AND ')}${clauses.length ? ' ' : ''}ORDER BY updated DESC`;
}

if (typeof module !== 'undefined') {
  module.exports = { buildFilterJql, escapeJqlValue };
}
