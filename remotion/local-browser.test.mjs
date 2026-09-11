import { expect, it, vi } from 'vitest';
import { localBrowserArgs, restrictLocalRenderBrowser } from './local-browser.mjs';
import path from 'node:path';
import childProcess, * as childProcessNamespace from 'node:child_process';

it('replaces unrestricted proxy options and preserves existing disabled features', () => {
  const args = localBrowserArgs(['about:blank', '--no-proxy-server', '--proxy-server=direct://', '--proxy-bypass-list=*', '--disable-features=Translate,BackForwardCache'], 12345);
  expect(args).not.toContain('--no-proxy-server');
  expect(args.filter(arg => arg.startsWith('--proxy-server='))).toEqual(['--proxy-server=http://127.0.0.1:12345']);
  expect(args).toContain('--proxy-bypass-list=localhost;127.0.0.1;[::1]');
  expect(args.find(arg => arg.startsWith('--disable-features='))).toContain('Translate,BackForwardCache');
  expect(args.find(arg => arg.startsWith('--disable-features='))).toContain('MediaRouter');
});

it('changes only the pinned render browser and restores process spawning', async () => {
  const spawn = vi.fn();
  const processes = { spawn };
  const browser = path.resolve('test-browser.exe');
  const release = await restrictLocalRenderBrowser(browser, processes);
  try {
    processes.spawn(browser, ['about:blank'], {});
    expect(spawn.mock.calls[0][1]).toContain('--disable-quic');
    expect(spawn.mock.calls[0][2].windowsHide).toBe(true);
    processes.spawn('ffmpeg', ['-version'], {});
    expect(spawn.mock.calls[1]).toEqual(['ffmpeg', ['-version'], {}]);
  } finally { await release(); }
  expect(processes.spawn).toBe(spawn);
});

it('updates the ESM namespace used by the installed renderer', async () => {
  const original = childProcess.spawn;
  const release = await restrictLocalRenderBrowser(path.resolve('test-browser.exe'));
  try {
    expect(childProcessNamespace.spawn).toBe(childProcess.spawn);
    expect(childProcessNamespace.spawn).not.toBe(original);
  } finally { await release(); }
  expect(childProcessNamespace.spawn).toBe(original);
});
