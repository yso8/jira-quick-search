const assert = require('node:assert/strict');
const { createDebugLogger } = require('../src/services/diagnostics/debug-logger.js');

(async () => {
  let calls = [];
  const logger = createDebugLogger({
    storage: {
      local: {
        get: async () => ({ debugLogs: true })
      }
    },
    console: {
      debug: (...args) => calls.push(args)
    }
  });

  await logger('request', { status: 400, token: 'must-not-be-logged' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '[Jira Quick Search] request');
  assert.equal(calls[0][1].token, '[masqué]');

  calls = [];
  const disabledLogger = createDebugLogger({
    storage: { local: { get: async () => ({ debugLogs: false }) } },
    console: { debug: (...args) => calls.push(args) }
  });
  await disabledLogger('hidden', { details: 'not logged' });
  assert.equal(calls.length, 0);

  console.log('debug-logger: 3 tests passed');
})();
