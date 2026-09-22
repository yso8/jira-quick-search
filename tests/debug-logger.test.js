const assert = require('node:assert/strict');
const { createDebugLogger } = require('../debug-logger.js');

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

  console.log('debug-logger: 2 tests passed');
})();
