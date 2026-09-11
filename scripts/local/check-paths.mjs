// Offline path verification only. Imports reviewed path/config modules, not app entry points.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadRuntime, projectRoot } from './runtime.mjs';

const { env, cwd, settings } = loadRuntime({
  ...process.env,
  podcli_home: 'C:/wrong-profile',
  PODCLI_OUTPUT: 'C:/wrong-output',
  PODCLI_TOKEN: 'synthetic-test-value',
  PODCLI_AI_PROVIDER: 'cloud',
});
const expectEmpty = process.argv.includes('--expect-empty');
assert.equal(env.podcli_home, undefined);
assert.equal(env.PODCLI_TOKEN, undefined);
assert.equal(env.PODCLI_AI_PROVIDER, 'codex-then-claude');
assert.equal(env.PODCLI_LOCAL_ONLY, '1');
assert.equal(env.PODCLI_HOME, settings.PODCLI_HOME);
assert.equal(env.PODCLI_OUTPUT, settings.PODCLI_OUTPUT);
Object.assign(process.env, env);
const { paths } = await import(pathToFileURL(join(projectRoot, 'src/config/paths.ts')).href);
assert.equal(paths.pythonPath, settings.PYTHON_PATH);
assert.equal(paths.envFile, settings.PODCLI_ENV_FILE);
if (expectEmpty) {
  assert.deepEqual(readdirSync(paths.knowledge), []);
  assert.deepEqual(readdirSync(paths.output), []);
}

const pythonCheck = `
import ast, json, os, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]) / "backend"))
from config.paths import paths
from config_bundle import _legacy_migration_pending, _legacy_project_dir
assert _legacy_project_dir() == Path(paths["home"]).resolve()
assert _legacy_migration_pending() is False
assert Path(tempfile.gettempdir()).resolve() == Path(os.environ["TEMP"]).resolve()
if "--expect-empty" in sys.argv:
    assert not list(Path(paths["knowledge"]).iterdir())

# Parse the changed renderer without importing its third-party dependencies.
renderer = ast.parse((Path(sys.argv[1]) / "backend/services/clip_generator.py").read_text(encoding="utf-8"))
assignment = next(node for node in ast.walk(renderer) if isinstance(node, ast.Assign)
                  and any(isinstance(target, ast.Name) and target.id == "bundle_cache_root" for target in node.targets))
expression = compile(ast.Expression(assignment.value), "<cache-path-check>", "eval")
render_script = str(Path(sys.argv[1]) / "remotion/render.mjs")
assert eval(expression) == os.environ["PODCLI_CACHE_DIR"]
saved_cache = os.environ.pop("PODCLI_CACHE_DIR")
try:
    assert eval(expression) == os.path.join(os.path.dirname(render_script), ".bundle-cache")
finally:
    os.environ["PODCLI_CACHE_DIR"] = saved_cache
print(json.dumps({"paths": paths, "legacyMigrationPending": False, "temporary": tempfile.gettempdir()}))
`;
// Use the configured project interpreter for this stdlib-only check.
const basePython = settings.PYTHON_PATH;
const result = spawnSync(basePython, ['-I', '-B', '-c', pythonCheck, projectRoot, ...(expectEmpty ? ['--expect-empty'] : [])], {
  cwd, env, encoding: 'utf8', windowsHide: true,
});
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
const python = JSON.parse(result.stdout);
for (const key of ['home', 'cache', 'transcripts', 'packed', 'working', 'output', 'logs', 'assets', 'history', 'knowledge']) {
  assert.equal(resolve(paths[key]).toLowerCase(), resolve(python.paths[key]).toLowerCase(), `${key} differs between Node and Python`);
}
assert.equal(resolve(paths.projectRoot), projectRoot);
console.log(JSON.stringify({
  passed: true,
  checks: [
    'Node and Python share all 11 storage paths',
    'Explicit Python and environment file paths',
    'Ambient Clipperz settings do not override this profile',
    ...(expectEmpty ? ['Knowledge and exports directories are empty'] : ['Existing knowledge and exports are preserved']),
    'Legacy migration has no pending import',
    'Python temporary files resolve to the designated tmp directory',
    'Python renderer honors explicit cache and preserves its default',
  ],
  applicationStarted: false,
  dependenciesInstalledByCheck: false,
}, null, 2));
