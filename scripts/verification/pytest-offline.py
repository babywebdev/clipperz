"""Run the repository tests with local fixtures and network/process tripwires."""
import os
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root))
sys.path.insert(0, str(root / 'backend'))
fixture = Path(os.environ['CLIPPERZ_TEST_FIXTURE'])

def audit(event, args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        with (fixture / 'blocked-network.log').open('a') as handle:
            handle.write(event + '\n')
        raise RuntimeError('Offline test harness blocked network access')
    if event == 'subprocess.Popen':
        executable = args[0]
        if executable is None:
            # Windows audits the prepared command line when executable= is unset.
            command = args[1]
            if isinstance(command, str):
                match = re.match(r'^(?:"([^"]+)"|(\S+))', command)
                executable = next(value for value in match.groups() if value)
            else:
                executable = command[0]
        name = Path(str(executable)).stem.lower()
        if name not in {'python', 'python3', 'ffmpeg', 'ffprobe', 'fc-list', 'fc-match', 'echo', 'sh'}:
            with (fixture / 'blocked-process.log').open('a') as handle:
                handle.write(f'{executable} | {os.environ.get("PYTEST_CURRENT_TEST", "collection")}\n')
            raise RuntimeError(f'Offline test harness blocked unreviewed executable: {name}')

sys.addaudithook(audit)
import pytest
raise SystemExit(pytest.main([
    'tests', '-q', '--tb=short', '-p', 'no:cacheprovider',
    '--junitxml=' + str(fixture / 'pytest.xml'), *sys.argv[1:],
]))
