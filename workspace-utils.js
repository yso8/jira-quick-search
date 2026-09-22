const WORKSPACE_MAX_RECENTS = 20;

function addRecentIssue(recents, issue, limit = WORKSPACE_MAX_RECENTS) {
  if (!issue || !issue.key) return recents;
  const next = [{ ...issue }, ...recents.filter(item => item.key !== issue.key)];
  return next.slice(0, limit);
}

function togglePinnedIssue(pinned, issue) {
  if (!issue || !issue.key) return pinned;
  return pinned.some(item => item.key === issue.key)
    ? pinned.filter(item => item.key !== issue.key)
    : [{ ...issue }, ...pinned];
}

function saveSearch(searches, search, now = new Date().toISOString()) {
  const id = search.id || `search-${Date.now()}`;
  const existing = searches.find(item => item.id === id);
  const saved = { ...search, id, createdAt: existing?.createdAt || now, lastUsedAt: now };
  return [saved, ...searches.filter(item => item.id !== id)];
}

function removeById(items, id) {
  return items.filter(item => item.id !== id && item.key !== id);
}

if (typeof module !== 'undefined') {
  module.exports = { WORKSPACE_MAX_RECENTS, addRecentIssue, togglePinnedIssue, saveSearch, removeById };
}
