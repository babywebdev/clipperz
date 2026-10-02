"""Run the real Clipperz CLI, signalling when it reaches the history lock.

Test seam for the 1B.2b.3 write-fence contention test. Usage:

    cli_lock_probe.py <marker> <cli args...>

Wraps the ``file_lock`` that ``services.clips_history`` uses so that, just
before the CLI's locked read-modify-write asks for the lock, ``<marker>`` is
created. Everything else is the unmodified ``backend/cli.py`` entry point, so a
test holding the lock knows the CLI has finished any unlocked lookup and is now
waiting. Never run against a real installation.
"""
import contextlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))

from services import clips_history  # noqa: E402

marker, *cli_args = sys.argv[1:]
real_file_lock = clips_history.file_lock


@contextlib.contextmanager
def signalling_file_lock(*args, **kwargs):
    Path(marker).write_text("waiting", encoding="utf-8")
    with real_file_lock(*args, **kwargs) as owner:
        yield owner


clips_history.file_lock = signalling_file_lock

import cli  # noqa: E402

sys.argv = [str(ROOT / "backend" / "cli.py"), "--no-banner", *cli_args]
cli.main()
