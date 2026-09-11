import childProcess from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';

export function localBrowserArgs(args, proxyPort) {
  const features = new Set(['MediaRouter', 'OptimizationHints', 'OptimizationGuideModelDownloading', 'OptimizationHintsFetching', 'AutofillServerCommunication']);
  for (const arg of args) if (arg.startsWith('--disable-features=')) {
    for (const feature of arg.slice('--disable-features='.length).split(',')) features.add(feature);
  }
  return [...args.filter(arg => !/^--(?:no-proxy-server|proxy-server|proxy-bypass-list|host-resolver-rules|disable-features)(?:=|$)/.test(arg)),
    `--proxy-server=http://127.0.0.1:${proxyPort}`,
    '--proxy-bypass-list=localhost;127.0.0.1;[::1]',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE [::1]',
    `--disable-features=${[...features].join(',')}`,
    '--disable-quic', '--disable-component-update',
  ];
}

/** Remotion 4 exposes no extra browser argv option. Scope this adapter to its
 * pinned browser inside the disposable render process; never change Chrome's
 * installed files or the user's browser settings. */
export async function restrictLocalRenderBrowser(executable, processModule = childProcess) {
  if (!executable || !path.isAbsolute(executable)) throw new Error('Local rendering requires a pinned browser executable.');
  const denyProxy = http.createServer((_req, res) => { res.writeHead(403); res.end('External rendering requests are disabled.'); });
  // Chromium may reset a denied background connection as it closes a page.
  // A CONNECT socket is no longer handled by the HTTP server after upgrade.
  denyProxy.on('connection', socket => socket.on('error', () => socket.destroy()));
  denyProxy.on('connect', (_req, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
  await new Promise((resolve, reject) => { denyProxy.once('error', reject); denyProxy.listen(0, '127.0.0.1', resolve); });
  const port = denyProxy.address().port;
  const original = processModule.spawn;
  const normalize = file => path.resolve(file).toLowerCase();
  processModule.spawn = function (command, args, options) {
    if (normalize(command) === normalize(executable)) {
      return original.call(this, command, localBrowserArgs(args || [], port), { ...options, windowsHide: true });
    }
    return original.call(this, command, args, options);
  };
  // The renderer's ESM bundle imports the built-in namespace, not its default.
  if (processModule === childProcess) syncBuiltinESMExports();
  return async () => {
    processModule.spawn = original;
    if (processModule === childProcess) syncBuiltinESMExports();
    denyProxy.closeAllConnections();
    await new Promise(resolve => denyProxy.close(resolve));
  };
}
