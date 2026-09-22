const SENSITIVE_KEYS = new Set(['token', 'jiraToken', 'authorization', 'cookie', 'password']);

function sanitizeDebugValue(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeDebugValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_KEYS.has(key.toLowerCase()) ? '[masqué]' : sanitizeDebugValue(item)
  ]));
}

function createDebugLogger(dependencies = { storage: globalThis.chrome.storage, console }) {
  return async function debugLog(event, details = {}) {
    const { debugLogs = false } = await dependencies.storage.local.get('debugLogs');
    if (debugLogs) {
      dependencies.console.debug(`[Jira Quick Search] ${event}`, sanitizeDebugValue(details));
    }
  };
}

const debugLog = typeof chrome !== 'undefined'
  ? createDebugLogger()
  : async () => {};

if (typeof module !== 'undefined') {
  module.exports = { createDebugLogger, sanitizeDebugValue };
}
