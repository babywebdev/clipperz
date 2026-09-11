"""Read help/features/auth status only; never submit an inference request."""
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'backend'))
from services.strict_ai import child_environment, command_for

env = child_environment()
options = dict(env=env, cwd=os.environ['PODCLI_INFERENCE_DIR'], text=True, encoding='utf-8',
               errors='replace', capture_output=True, timeout=20, creationflags=subprocess.CREATE_NO_WINDOW)
Path(options['cwd']).mkdir(parents=True, exist_ok=True)
codex = os.environ['PODCLI_CODEX_PATH']
claude = os.environ['PODCLI_CLAUDE_PATH']
status = subprocess.run([codex, 'login', 'status'], **options)
codex_status = {'signed_in_chatgpt': status.returncode == 0 and 'chatgpt' in (status.stdout + status.stderr).lower()}
claude_run = subprocess.run([claude, '--safe-mode', '--restricted', '--setting-sources', '', 'auth', 'status', '--json'], **options)
try:
    parsed = json.loads(claude_run.stdout)
except ValueError:
    parsed = {}
claude_status = {'logged_in': bool(parsed.get('loggedIn')), 'auth_method': parsed.get('authMethod')}

# Validate all selected feature names/values without opening an inference session.
command = command_for('codex', codex, str(Path(options['cwd'], 'unused-answer.txt')))
overrides = [command[i + 1] for i, value in enumerate(command) if value == '-c']
args = [codex]
for value in overrides:
    args += ['-c', value]
args += ['features', 'list']
features = subprocess.run(args, **options)
assert features.returncode == 0, 'Codex rejected the configuration overrides'
states = {line.split()[0]: line.split()[-1] for line in features.stdout.splitlines() if line.strip()}
for value in overrides:
    if value.startswith('features.'):
        key, expected = value.split('=', 1)
        assert states.get(key.removeprefix('features.')) == expected, f'Unsupported feature override: {key}'
report = {'codex': codex_status, 'claude': claude_status, 'codex_feature_overrides_verified': True,
          'inference_requests': 0, 'credentials_copied': False}
(root / '_local/verification').mkdir(parents=True, exist_ok=True)
(root / '_local/verification/step-5-clients.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
