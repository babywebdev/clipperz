// Generate a local registration snippet; never edit the user's global settings.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, projectRoot } from './runtime.mjs';
import { localMcpTools } from '../../dist/config/policy.js';

const { settings } = loadRuntime();
const spec = {
  command: settings.PODCLI_NODE,
  args: [join(projectRoot, 'scripts/local/launch.mjs').replaceAll('\\', '/'), 'mcp'],
  cwd: settings.PODCLI_HOME,
  enabled: true, startup_timeout_sec: 30, tool_timeout_sec: 3600,
  enabled_tools: [...localMcpTools].sort(),
};
const block = '[mcp_servers.clipperz]\n' + Object.entries(spec)
  .map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n') + '\n';
const output = join(projectRoot, '_local/verification');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'clipperz-mcp.toml'), block);
writeFileSync(join(output, 'clipperz-mcp.json'), JSON.stringify(spec, null, 2) + '\n');
console.log(block);
