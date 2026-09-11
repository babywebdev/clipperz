import { createConnection } from 'node:net';

export async function studioStatus({ host = '127.0.0.1', port, home }) {
  const url = `http://${host}:${port}`;
  try {
    const response = await fetch(url + '/api/health', { signal: AbortSignal.timeout(1500), redirect: 'error' });
    const health = await response.json();
    if (health.service === 'clipperz-studio' && typeof health.home === 'string' &&
        health.home.replaceAll('\\', '/').toLowerCase() === home.replaceAll('\\', '/').toLowerCase()) {
      return { status: 'running', url, pid: health.pid };
    }
  } catch {}
  const listening = await new Promise(resolve => {
    const socket = createConnection({ host, port: Number(port) });
    socket.setTimeout(1500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(true); });
  });
  return { status: listening ? 'occupied' : 'stopped', url };
}
