// A test-only tripwire for unexpected network traffic, not an application policy.
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
function blocked() {
  appendFileSync(join(process.env.CLIPPERZ_TEST_FIXTURE, 'blocked-network.log'), 'Unexpected network attempt\n');
  throw new Error('Offline test harness blocked network access');
}
globalThis.fetch = blocked;
http.request = http.get = https.request = https.get = blocked;
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if ((typeof options === 'object' && options?.path) || (typeof options === 'string' && !/^\d+$/.test(options))) {
    return connect.apply(this, args); // local IPC remains available to the test runner
  }
  return blocked();
};
syncBuiltinESMExports();
