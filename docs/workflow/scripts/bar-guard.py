#!/usr/bin/env python3
"""Read-only weakened-bar scan of changes against a named Git base. Python 3; no writes.

Scans the working tree and the index against --base, plus untracked files, for
added suppressions, skipped or focused tests, removed tests and assertions,
throwing stubs, empty catch blocks, added TODOs, disabled checks, lowered
thresholds and removed CI steps. Prints rule, path and line only; matched text is
never printed. Findings are leads to disposition, never verdicts or blockers.
Like review-packet.py, it refuses to run when a link or junction sits where Git
would visit it; inspect the diff directly then. Paths that a configured clean or
process filter (as with Git LFS) applies to are excluded and named, so the filter
never runs; submodule contents are never scanned, and uncommitted changes inside a
submodule are not seen at all (only a changed recorded commit counts as incomplete).
Files behind a UTF-16 or UTF-32 byte-order mark are decoded, including base/index
blobs read without filters. Binary and undecodable content is named incomplete. It skips the
index refresh and submodule status checks that could write the index or run commands.
Diff context added by configuration or GIT_DIFF_OPTS is read, never dropped, and a hunk
that does not match its header stops the scan. Run from the project root.
Exit 0: no findings, everything in scope inspected. Exit 1: findings; incomplete lines
still print. Exit 2: could not run. Exit 3: no findings, but something in scope was not
inspected (binary or undecodable content, or a changed submodule).
"""
import argparse
from collections import Counter
import difflib
import json
from pathlib import Path
import re
import runpy
import stat
import subprocess
import sys


def shared():
    path = Path(__file__).absolute().with_name('section.py')
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        info = current.lstat()
        if part.casefold() == 'archive-dnr' or stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('excluded helper path or ancestor')
    return runpy.run_path(str(path))


RULES = {
    'suppression-added': 'added lint, type or coverage suppression',
    'test-skipped-or-focused': 'added skipped, focused, expected-failure or placeholder test',
    'test-removed': 'test definition removed or changed in a remaining test file (no identical line re-added)',
    'test-file-deleted': 'test file deleted, or renamed to a path that is not a scanned test path',
    'assertion-removed': 'assertion removed or changed in a remaining test file (no identical line re-added)',
    'throwing-stub': 'added throwing stub standing in for an implementation',
    'empty-catch': 'added empty catch or except block',
    'todo-added': 'added TODO/FIXME/XXX comment',
    'check-disabled': 'added or changed configuration that disables or loosens a check',
    'threshold-lowered': 'threshold changed in the weaker direction',
    'ci-step-removed': 'CI line removed or changed (no identical line re-added)',
    'ci-config-deleted': 'CI configuration file deleted, or renamed to a path that is not a scanned CI path',
}
SUPPRESSION = re.compile(r'@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|biome-ignore|istanbul\s+ignore|c8\s+ignore|v8\s+ignore'
                         r'|#\s*noqa\b|#\s*type:\s*ignore|#\s*pyright:\s*ignore|#\s*ruff:\s*noqa\b|#\s*pylint:\s*disable|pragma:\s*no\s+cover')
SKIP_ANY = re.compile(r'\b(?:it|test|describe|suite|context)(?:\.concurrent)?\.(?:skip|only|todo)\b'
                      r'|\b(?:it|test|describe)(?:\.concurrent)?\.(?:skipIf|fails|failing)\s*\(|\btest(?:\.describe)?\.fixme\s*\('
                      r'|@pytest\.mark\.(?:skip|skipif|xfail)\b|\bpytestmark\s*=.*\bpytest\.mark\.(?:skip|skipif|xfail)\b'
                      r'|\bpytest\.(?:skip|xfail)\s*\(|@unittest\.skip|\.skipTest\s*\(|@Disabled\b')
SKIP_TEST = re.compile(r'\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(|\bt\.Skip(?:f|Now)?\s*\(|@Ignore\b')
TEST_DEF = re.compile(r'^\s*(?:(?:it|test|describe)(?:\.\w+)*\s*\(|(?:async\s+)?def\s+test\w*\s*\(|func\s+Test\w*\s*\()')
ASSERTION = re.compile(r'\bexpect\s*\(|\bassert\w*\b|\.should\b|\bt\.(?:Error|Fatal)f?\s*\(|\brequire\.\w+\s*\(')
STUB = re.compile(r'''throw\s+new\s+\w*(?:Error|Exception)\s*\(\s*['"`][^'"`]*(?:not\s+(?:yet\s+)?implemented|todo|unimplemented|stub)|\braise\s+NotImplementedError\b|\b(?:todo|unimplemented)!\s*\(|\bpanic\s*\(\s*"[^"]*not\s+implemented|throw\s+new\s+NotImplementedException\b''', re.I)
EMPTY_CATCH = re.compile(r'\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}|\.catch\s*\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>\s*(?:\{\s*\}|undefined|null)\s*\)|^\s*except\b[^:]*:\s*(?:pass|\.\.\.)\s*(?:#.*)?$')
CATCH_OPEN = re.compile(r'\bcatch\s*(?:\([^)]*\))?\s*\{\s*$')
EXCEPT_OPEN = re.compile(r'^\s*except\b[^:]*:\s*(?:#.*)?$')
TODO = re.compile(r'(?://|#|/\*|^\s*\*|<!--|--)\s*(?:TODO|FIXME|XXX)\b')
CHECK_OFF = re.compile(r'''ignoreBuildErrors\W*true|ignoreDuringBuilds\W*true|continue-on-error\W*true|--no-verify\b|--passWithNoTests\b|["']?(?:strict|noImplicitAny|strictNullChecks|noUncheckedIndexedAccess|noImplicitReturns)["']?\s*[:=]\s*false''', re.I)
THRESHOLD = re.compile(r'''(?<![\w-])["']?((?:--)?[\w-]*?(?:threshold|coverage|branches|functions|lines|statements|warnings|fail[_-]?under)[\w-]*)["']?\s*(?:[:=]\s*|\s+)["']?(-?\d+(?:\.\d+)?)''', re.I)
CI_CONTENT = re.compile(r'^\s*[^\s#]')  # any line that is not blank and not a comment
CI_IF_FALSE = re.compile(r'''^\s*-?\s*if:\s*(?:false|\$\{\{\s*false\s*\}\}|(['"])false\1)\s*(?:#.*)?$''')
ESLINT_RULE = re.compile(r'''(?P<q>['"]?)(?P<rule>@?[\w-]+(?:/[\w-]+)*)(?P=q)\s*:\s*\[?\s*(?P<v>['"]?)(?P<sev>error|warn|off|[012])(?P=v)(?![\w-])''')
SEVERITY = {'error': 2, '2': 2, 'warn': 1, '1': 1, 'off': 0, '0': 0}
# ESLint core rules without a hyphen; any other bare key with a 0-2 value may be a rule option.
ONE_WORD_RULES = {'camelcase', 'complexity', 'curly', 'eqeqeq', 'indent', 'quotes', 'radix', 'semi', 'strict', 'yoda'}
TS_STRICT_TRUE = re.compile(r'''["']?(strict|noImplicitAny|strictNullChecks|noUncheckedIndexedAccess|noImplicitReturns)["']?\s*:\s*true\b''')
JSON_STRING = r'"(?:[^"\\]|\\.)*"'
JSON_MEMBER = re.compile(r'(' + JSON_STRING + r')\s*:\s*(' + JSON_STRING + r')')
PACKAGE_SCRIPT_NAME = re.compile(r'(?:test|lint|typecheck|build)(?::.*)?\Z')
BYPASS = re.compile(r'\|\|\s*(?:true|exit\s+0)\b')
TEST_PATH = re.compile(r'(?:^|/)(?:tests?|__tests__|specs?|e2e)/|\.(?:test|spec|cy)\.[cm]?[jt]sx?$|(?:^|/)test_[^/]*\.py$|_test\.(?:py|go)$|Tests?\.(?:java|kt|cs)$|_spec\.rb$', re.I)
CI_PATH = re.compile(r'(?:^|/)\.github/workflows/[^/]+\.ya?ml$|(?:^|/)\.gitlab-ci\.ya?ml$|(?:^|/)azure-pipelines\.ya?ml$|(?:^|/)\.circleci/config\.ya?ml$|(?:^|/)Jenkinsfile$|(?:^|/)bitbucket-pipelines\.ya?ml$|(?:^|/)\.husky/[^/]+$', re.I)
CONFIG_PATH = re.compile(r'\.(?:json|jsonc|ya?ml|toml|ini|cfg)$|(?:^|/)[^/]*\.config\.[cm]?[jt]s$|(?:^|/)\.[\w.-]*rc(?:\.\w+)?$|(?:^|/)\.coveragerc$', re.I)
ESLINT_PATH = re.compile(r'(?:^|/)(?:eslint\.config\.[cm]?[jt]s|\.eslintrc(?:\.(?:c?js|json|ya?ml))?)$', re.I)
TSCONFIG_PATH = re.compile(r'(?:^|/)tsconfig(?:\.[\w.-]+)?\.json$', re.I)
PACKAGE_PATH = re.compile(r'(?:^|/)package\.json$', re.I)
CODECOV_PATH = re.compile(r'(?:^|/)\.?codecov\.ya?ml$', re.I)
PROSE_PATH = re.compile(r'\.(?:md|markdown)$', re.I)
# Workflow records, instructions and helpers are not product checks; their own text names these patterns.
WORKFLOW_ROOTS = ('docs/workflow/', 'docs/project/', 'docs/adr/', 'docs/external/')
PATHSPEC = ['.', ':(exclude,icase)**/archive-dnr/**', ':(exclude,icase)archive-dnr/**',
            ':(exclude,icase)**/archive-dnr', ':(exclude,icase)archive-dnr',
            *(':(exclude)' + root + '**' for root in WORKFLOW_ROOTS)]
FINDING_LIMIT = 200
BOMS = ((b'\xff\xfe\x00\x00', 'utf-32'), (b'\x00\x00\xfe\xff', 'utf-32'), (b'\xff\xfe', 'utf-16'), (b'\xfe\xff', 'utf-16'))


def unquote(value):
    """Undo Git's C-style path quoting without trusting the bytes."""
    body, out, i = value[1:-1], bytearray(), 0
    simple = {'a': 7, 'b': 8, 'f': 12, 'n': 10, 'r': 13, 't': 9, 'v': 11, '\\': 92, '"': 34}
    while i < len(body):
        if body[i] == '\\' and i + 1 < len(body):
            if body[i + 1] in simple:
                out.append(simple[body[i + 1]])
                i += 2
                continue
            if re.fullmatch(r'[0-7]{3}', body[i + 1:i + 4]):
                out.append(int(body[i + 1:i + 4], 8) & 0xFF)
                i += 4
                continue
        out.extend(body[i].encode('utf-8'))
        i += 1
    return out.decode('utf-8', 'replace')


def header_path(value, prefixed=True):
    if value.endswith('\t'):
        value = value[:-1]
    if value == '/dev/null':
        return None
    if value.startswith('"') and value.endswith('"') and len(value) > 1:
        value = unquote(value)
    return value[2:] if prefixed and value.startswith(('a/', 'b/')) else value


def git_header_path(rest):
    """Path from a symmetric 'a/X b/X' header; binary changes print no ---/+++ lines."""
    quoted = re.fullmatch(r'("(?:[^"\\]|\\.)*") ("(?:[^"\\]|\\.)*")', rest)
    if quoted:
        old, new = unquote(quoted[1]), unquote(quoted[2])
        return new[2:] if new.startswith('b/') and old[2:] == new[2:] else None
    half = (len(rest) - 1) // 2
    old, new = rest[:half], rest[half + 1:]
    if len(rest) % 2 and rest[half] == ' ' and old.startswith('a/') and new.startswith('b/') and old[2:] == new[2:]:
        return new[2:]
    return None


def shape_error(item):
    path = item['new'] or item['old'] or item['header'] or 'a path'
    return f'the diff hunk for {shown(path)} does not match its header, so no findings were reported. Inspect the diff directly.'


def parse(diff):
    """Parse unified diff output into per-file added/removed lines with their line numbers.

    Context lines only advance both line numbers: diff.interHunkContext and GIT_DIFF_OPTS
    can add them despite -U0, and they must not end a hunk early. A hunk body shorter or
    longer than its header counts raises ValueError instead of being read in part.
    """
    files, current, left, hunks = [], None, (0, 0), False
    old_no = new_no = 0
    lines = diff.split('\n')
    if lines[-1] == '':
        lines.pop()  # the newline that ends the output, not a bare empty context line
    for line in lines:
        if left != (0, 0) and current is not None:
            if line.startswith('-') and left[0]:
                current['removed'].append((old_no, line[1:]))
                old_no, left = old_no + 1, (left[0] - 1, left[1])
            elif line.startswith('+') and left[1]:
                current['added'].append((new_no, line[1:]))
                new_no, left = new_no + 1, (left[0], left[1] - 1)
            elif (line.startswith(' ') or not line) and all(left):  # diff.suppressBlankEmpty prints empty context bare
                old_no, new_no, left = old_no + 1, new_no + 1, (left[0] - 1, left[1] - 1)
            elif not line.startswith('\\'):
                raise ValueError(shape_error(current))
            continue
        if hunks and (not line or line[0] in '+- '):  # a body line beyond its hunk's header counts
            raise ValueError(shape_error(current))
        if line.startswith('diff --git '):
            current = {'old': None, 'new': None, 'header': git_header_path(line[len('diff --git '):]), 'renamed': None,
                       'renamed_from': None, 'deleted': False, 'binary': False, 'gitlink': False, 'added': [], 'removed': [],
                       'oids': None}
            files.append(current)
            hunks = False
        elif current is None:
            continue
        elif line.startswith('deleted file mode'):
            current['deleted'] = True
            current['gitlink'] |= line.endswith(' 160000')
        elif line.startswith(('new file mode', 'old mode', 'new mode')):
            current['gitlink'] |= line.endswith(' 160000')
        elif line.startswith('index '):
            current['gitlink'] |= line.endswith(' 160000')
            ids = re.match(r'index ([0-9a-f]+)\.\.([0-9a-f]+)', line)
            if ids:
                current['oids'] = (ids[1], ids[2])
        elif line.startswith('rename from '):
            current['renamed_from'] = header_path(line[len('rename from '):], prefixed=False)
        elif line.startswith('rename to '):
            current['renamed'] = header_path(line[len('rename to '):], prefixed=False)
        elif line.startswith('Binary files ') and line.endswith(' differ'):
            current['binary'] = True
        elif line.startswith('--- '):
            current['old'] = header_path(line[4:])
        elif line.startswith('+++ '):
            current['new'] = header_path(line[4:])
        elif line.startswith('@@ '):
            hunk = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', line)
            if not hunk:
                raise ValueError(shape_error(current))
            old_no, new_no = int(hunk[1]), int(hunk[3])
            left = (int(hunk[2]) if hunk[2] is not None else 1, int(hunk[4]) if hunk[4] is not None else 1)
            hunks = True
    if left != (0, 0):
        raise ValueError(shape_error(current))
    return files


def excluded(path):
    return (any(p.casefold() == 'archive-dnr' for p in path.split('/')) or bool(PROSE_PATH.search(path))
            or path.startswith(WORKFLOW_ROOTS))


def net_removed(removed, added, pattern):
    """Removed matching lines not re-added verbatim in the file; other added checks never offset them."""
    pool, result = Counter(t.strip() for _, t in added if pattern.search(t)), []
    for n, t in removed:
        if not pattern.search(t):
            continue
        if pool[t.strip()] > 0:
            pool[t.strip()] -= 1
        else:
            result.append(n)
    return result


def json_config(text):
    """JSON/JSONC object, allowing comments and trailing commas without changing strings."""
    text = re.sub(JSON_STRING + r'|//[^\n]*|/\*[\s\S]*?\*/',
                  lambda m: m[0] if m[0].startswith('"') else ' ' * len(m[0]), text)
    text = re.sub(JSON_STRING + r'|,\s*(?=[}\]])',
                  lambda m: m[0] if m[0].startswith('"') else '', text)
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {}
    except ValueError:
        return {}


def shell_bypass(text):
    """Only shell operators outside quoted/escaped command text count as bypasses."""
    visible, quote, escaped = [], None, False
    for char in text:
        if escaped:
            escaped = False
            visible.append(' ')
        elif char in ('\\', '^') and quote != "'":
            escaped = True
            visible.append(' ')
        elif quote:
            if char == quote:
                quote = None
            visible.append(' ')
        elif char in ('"', "'", '`'):
            quote = char
            visible.append(' ')
        else:
            visible.append(char)
    return bool(BYPASS.search(''.join(visible)))


def config_values(lines, document):
    if document is not None:
        return json_config(document)
    # Unit callers and partial diffs still recognize complete escaped JSON members.
    return {json.loads(m[1]): json.loads(m[2]) for m in JSON_MEMBER.finditer('\n'.join(t for _, t in lines))}


def config_rules(path, removed, added, report, documents=None):
    """Loosened ESLint severities, tsconfig strictness and extends, and script bypasses, by name."""
    if ESLINT_PATH.search(path):
        def rules(lines):
            for n, text in lines:
                for match in ESLINT_RULE.finditer(text):
                    # A bare number is a severity only for a rule name, never an option such as ecmaVersion or max.
                    if match['sev'].isdigit() and not re.search(r'[-/]', match['rule']) and match['rule'] not in ONE_WORD_RULES:
                        continue
                    yield n, match['rule'], SEVERITY[match['sev']]
        before = {}
        for _, rule, level in rules(removed):
            before.setdefault(rule, []).append(level)
        for n, rule, level in rules(added):
            if before.get(rule) and level < before[rule].pop(0):
                report('check-disabled', path, n)
    if TSCONFIG_PATH.search(path):
        kept = Counter(match[1] for _, text in added for match in TS_STRICT_TRUE.finditer(text))
        for n, text in removed:
            for match in TS_STRICT_TRUE.finditer(text):
                if kept[match[1]] > 0:
                    kept[match[1]] -= 1
                else:
                    report('check-disabled', path, n, True)
        old = config_values(removed, documents[0] if documents else None)
        new = config_values(added, documents[1] if documents else None)
        if 'extends' in old and old['extends'] != new.get('extends'):
            lines = added or removed
            report('check-disabled', path, next((n for n, t in lines if 'extends' in t), lines[0][0] if lines else 1), not bool(added))
    if PACKAGE_PATH.search(path):
        old = config_values(removed, documents[0] if documents else None)
        new = config_values(added, documents[1] if documents else None)
        old, new = (old.get('scripts', {}), new.get('scripts', {})) if documents else (old, new)
        if isinstance(old, dict) and isinstance(new, dict):
            for name, value in new.items():
                if PACKAGE_SCRIPT_NAME.fullmatch(name) and isinstance(value, str) and shell_bypass(value):
                    if not (isinstance(old.get(name), str) and shell_bypass(old[name])):
                        n = next((n for n, t in added if json.dumps(name) in t), added[0][0] if added else 1)
                        report('check-disabled', path, n)


def analyze(path, removed, added, deleted, report, documents=None):
    is_test, is_ci = bool(TEST_PATH.search(path)), bool(CI_PATH.search(path))
    if deleted:
        if is_test:
            report('test-file-deleted', path, 1, True)
        if is_ci:
            report('ci-config-deleted', path, 1, True)
        return
    for n, text in added:
        if SUPPRESSION.search(text):
            report('suppression-added', path, n)
        if SKIP_ANY.search(text) or (is_test and SKIP_TEST.search(text)):
            report('test-skipped-or-focused', path, n)
        if STUB.search(text):
            report('throwing-stub', path, n)
        if EMPTY_CATCH.search(text):
            report('empty-catch', path, n)
        if TODO.search(text):
            report('todo-added', path, n)
        if CHECK_OFF.search(text) or (is_ci and CI_IF_FALSE.search(text)):
            report('check-disabled', path, n)
    for (n1, t1), (n2, t2) in zip(added, added[1:]):
        if n2 == n1 + 1 and ((CATCH_OPEN.search(t1) and t2.strip() in ('}', '})', '});')) or
                             (EXCEPT_OPEN.search(t1) and t2.strip() in ('pass', '...'))):
            report('empty-catch', path, n1)
    if is_test:
        for n in net_removed(removed, added, TEST_DEF):
            report('test-removed', path, n, True)
        for n in net_removed(removed, added, ASSERTION):
            report('assertion-removed', path, n, True)
    if is_ci:
        for n in net_removed(removed, added, CI_CONTENT):
            report('ci-step-removed', path, n, True)
    config_rules(path, removed, added, report, documents)
    if not (is_ci or CONFIG_PATH.search(path)):
        return
    before = {}
    for _, text in removed:
        for match in THRESHOLD.finditer(text):
            before.setdefault(match[1].lower().lstrip('-'), []).append(float(match[2]))
    for n, text in added:
        for match in THRESHOLD.finditer(text):
            key = match[1].lower().lstrip('-')
            if before.get(key):
                old, new = before[key].pop(0), float(match[2])
                # Codecov's threshold is the allowed drop, so raising it loosens the check.
                looser = key == 'threshold' and CODECOV_PATH.search(path)
                if (new > old) if ('warning' in key or looser) else (new < old):
                    report('threshold-lowered', path, n)


def shown(path):
    return path if path.isprintable() else repr(path)


def decode_text(h, data):
    """Strict decoding preserves invalid bytes as an explicit incomplete result."""
    if len(data) > h['READ_LIMIT']:
        raise ValueError(f'larger than {h["READ_LIMIT"]} bytes')
    codec = next((name for bom, name in BOMS if data.startswith(bom)), 'utf-8-sig')
    text = data.decode(codec)
    # Preserve the conservative BOM-binary heuristic; inconclusive content is never called clean.
    if '\x00' in text or any(ord(c) < 32 and c not in '\t\n\r\f' for c in text):
        raise UnicodeError('binary control bytes')
    if codec != 'utf-8-sig' and 2 * sum(c < '\x80' for c in text) < len(text):
        raise UnicodeError('not text behind its byte-order mark')
    return text.replace('\r\n', '\n').replace('\r', '\n')


def read_bytes(h, root, path):
    target = h['safe_path'](root/path, 'file', root)
    with target.open('rb') as stream:
        return stream.read(h['READ_LIMIT'] + 1)


def blob_bytes(h, root, oid):
    if not oid.strip('0'):
        return b''
    code, size, error = h['git'](root, 'cat-file', '-s', oid)
    if code:
        raise ValueError('blob size unavailable: ' + error.strip()[:200])
    if int(size) > h['READ_LIMIT']:
        raise ValueError(f'larger than {h["READ_LIMIT"]} bytes')
    code, data, error = h['git'](root, 'cat-file', 'blob', oid, raw=True)
    if code:
        raise ValueError('blob unavailable: ' + error.strip()[:200])
    return data


def text_delta(old, new):
    before, after = old.splitlines(), new.splitlines()
    if len(before) * len(after) > 2_000_000:
        raise ValueError('decoded line comparison exceeds 2000000 line pairs; inspect directly')
    removed, added = [], []
    for tag, a, b, c, d in difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes():
        if tag != 'equal':
            removed.extend(enumerate(before[a:b], a+1))
            added.extend(enumerate(after[c:d], c+1))
    return removed, added


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:  # Windows pipes default to a code page that cannot hold paths or record text
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--base', required=True, help='Git ref naming the comparison base (for example the slice baseline commit)')
    parser.add_argument('--root', default='.')
    args = parser.parse_args(argv)
    findings, limits, changed_links = {}, [], set()

    def report(rule, path, line, base=False, source='working tree'):
        findings.setdefault((rule, path, line, base), source)

    try:
        h = shared()
        root = h['safe_path'](args.root, 'dir')
        if args.base.startswith('-') or any(c in args.base for c in '\r\n\x00'):
            raise ValueError('invalid base ref')
        submodules = h['safe_git_tree'](root)
        code, commit, error = h['git'](root, 'rev-parse', '--verify', '--end-of-options', args.base + '^{commit}')
        if code:
            raise ValueError('base does not resolve to a commit: ' + error.strip()[:200])
        commit = commit.strip()
        excludes, filter_lines = h['filter_exclusions'](root, PATHSPEC)
        pathspec = PATHSPEC + excludes
        # No auto refresh: a stat-only change would otherwise rewrite the index and run its hook.
        # Ignoring dirty submodules keeps Git from running status, and their filters, inside them.
        # Zero inter-hunk context undoes diff.interHunkContext; parse() still reads context from GIT_DIFF_OPTS.
        diff_args = ['-c', 'core.quotePath=false', '-c', 'diff.autoRefreshIndex=false', 'diff', '--no-ext-diff',
                     '--no-textconv', '--no-color', '--ignore-submodules=dirty', '--submodule=short',
                     '--src-prefix=a/', '--dst-prefix=b/', '--full-index', '-U0', '--inter-hunk-context=0', '-M']
        for source, extra in (('working tree', []), ('index', ['--cached'])):
            code, output, error = h['git'](root, *diff_args, *extra, commit, '--', *pathspec, raw=True)
            if code:
                raise ValueError(source + ' diff failed: ' + error.strip()[:300])
            for item in parse(output.decode('utf-8', 'surrogateescape')):
                path = item['new'] or item['old'] or item['renamed'] or item['header']
                old = item['renamed_from']
                if old and old != path and not excluded(old):
                    # Renaming out of a scanned test or CI path removes it from every later scan.
                    stays = path and not excluded(path)
                    if TEST_PATH.search(old) and not (stays and TEST_PATH.search(path)):
                        report('test-file-deleted', old, 1, True, source)
                    if CI_PATH.search(old) and not (stays and CI_PATH.search(path)):
                        report('ci-config-deleted', old, 1, True, source)
                if not path or excluded(path):
                    continue
                if item['gitlink']:
                    changed_links.add(path)
                    continue
                documents = None
                if item['oids']:
                    try:
                        before_data = blob_bytes(h, root, item['oids'][0])
                        after_data = b'' if item['deleted'] else (blob_bytes(h, root, item['oids'][1]) if source == 'index' else read_bytes(h, root, path))
                        before, after = decode_text(h, before_data), decode_text(h, after_data)
                        documents = (before, after)
                        # Attributes can force a text diff for BOM or binary content. Validate
                        # every changed file; rebuild BOM line deltas independently of Git's label.
                        if item['binary'] or any(data.startswith(bom) for data in (before_data, after_data) for bom, _ in BOMS):
                            item['removed'], item['added'] = text_delta(before, after)
                    except (OSError, UnicodeError, ValueError) as error:
                        reason = 'binary change not inspected' if item['binary'] else 'undecodable change not inspected'
                        limits.append(shown(path) + ': ' + reason + ': ' + str(error)[:120])
                        # A forced-text diff can still contain useful findings. Keep them
                        # alongside the incomplete notice, including finding exit precedence.
                        if item['binary']:
                            continue
                elif item['binary']:
                    limits.append(shown(path) + ': binary change not inspected')
                    continue
                elif any(any('\udc80' <= c <= '\udcff' for c in t) for _, t in item['removed'] + item['added']):
                    limits.append(shown(path) + ': undecodable changed content not fully inspected')
                analyze(path, item['removed'], item['added'], item['deleted'],
                        lambda rule, p, n, base=False, s=source: report(rule, p, n, base, s), documents)
        code, output, error = h['git'](root, 'ls-files', '--others', '--exclude-standard', '-z', '--', *pathspec)
        if code:
            raise ValueError('untracked listing failed: ' + error.strip()[:200])
        for path in (p for p in output.split('\x00') if p):
            if excluded(path):
                continue
            try:
                text = decode_text(h, read_bytes(h, root, path))
            except FileNotFoundError:
                continue
            except UnicodeError:
                limits.append(shown(path) + ': untracked binary or undecodable file not inspected')
                continue
            except (OSError, ValueError) as error:
                limits.append(shown(path) + ': untracked file not inspected: ' + str(error)[:120])
                continue
            analyze(path, [], list(enumerate(text.split('\n'), 1)), False,
                    lambda rule, p, n, base=False: report(rule, p, n, base, 'untracked'), ('', text))
    except FileNotFoundError as error:
        print('Could not run: no Git repository or required file at the root: ' + str(error)[:300], file=sys.stderr)
        return 2
    except (OSError, UnicodeError, ValueError, subprocess.TimeoutExpired) as error:
        print('Could not run: ' + str(error)[:500], file=sys.stderr)
        return 2
    print('Weakened-bar scan (read-only). Findings are leads to disposition in the self-audit or review, never verdicts or automatic blockers.')
    print(f'Base: {commit}. Scanned: working tree and index against the base, plus untracked files. Matched text is never printed.')
    print('Excluded: archive-dnr, Markdown prose and the workflow roots ' + ', '.join(WORKFLOW_ROOTS) + '; inspect those directly when they matter.')
    for line in filter_lines:
        print('Excluded: ' + line + '.')
    for path in submodules:
        print(f'Excluded: submodule {shown(path)}: contents never scanned, including any uncommitted changes inside it.')
    ordered = sorted(findings.items(), key=lambda item: (item[0][1], item[0][3], item[0][2], item[0][0]))
    for (rule, path, line, base), source in ordered[:FINDING_LIMIT]:
        where = f'{shown(path)}:{line}' + (' (base line)' if base else '')
        print(f'{rule}: {where}' + ('' if source == 'working tree' else f' [{source}]'))
    if len(ordered) > FINDING_LIMIT:
        print(f'INCOMPLETE: {len(ordered) - FINDING_LIMIT} further findings omitted; inspect the diff directly.')
    incomplete = list(dict.fromkeys(limits)) + [f'{shown(path)}: submodule commit changed; its contents were not scanned'
                                                for path in sorted(changed_links)]
    for limit in incomplete[:20]:
        print('INCOMPLETE: ' + limit)
    if len(incomplete) > 20:
        print(f'INCOMPLETE: {len(incomplete) - 20} further items not inspected.')
    used = sorted({key[0] for key in findings})
    if used:
        print('Rules: ' + '; '.join(f'{rule} = {RULES[rule]}' for rule in used))
    print(f'Summary: {len(findings)} finding(s) in {len({key[1] for key in findings})} file(s); {len(incomplete)} item(s) not inspected.')
    if findings:
        return 1
    return 3 if incomplete else 0


if __name__ == '__main__':
    sys.exit(main())
