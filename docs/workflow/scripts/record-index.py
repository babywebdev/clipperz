#!/usr/bin/env python3
"""Read-only, bounded index of workflow Markdown records (Python 3 standard library).

Accept only the flat quoted-scalar schema in docs/workflow/record-frontmatter.md.
Never backfill metadata, emit record bodies, or traverse links/reparse points.
"""

import argparse
import json
import os
from pathlib import Path
import re
import stat
import sys

KINDS = {'spec', 'spec-log', 'worker-report', 'review', 'disposition', 'assignment',
         'direction', 'phase-report', 'adr', 'external', 'ledger'}
FIELDS = {'record', 'task', 'cycle', 'spec_revision', 'snapshot', 'author', 'date',
          'state', 'summary', 'read_when', 'evidence', 'workflow_version',
          'instruction_inventory', 'superseded_by'}
REQUIRED = {'record', 'author', 'date', 'state', 'summary', 'read_when'}
HEADER_LIMIT = 16384
HEADER_LINES = 64


def is_link(path):
    info = path.lstat()
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, 'st_file_attributes', 0) & getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0x400))


def safe_root(raw):
    """Check ancestors before resolution, so even an explicitly named link is refused."""
    path = Path(os.path.abspath(raw))
    if any(part.casefold() == 'archive-dnr' for part in Path(raw).parts + path.parts):
        raise ValueError('archive-dnr roots are excluded')
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        if is_link(current):
            raise ValueError('symlink/junction/reparse-point root or ancestor is excluded')
    resolved = path.resolve(strict=True)
    if not resolved.is_dir():
        raise ValueError('root must be a directory')
    return resolved


def walk_records(root, warnings):
    """Prune forbidden names before inspecting their contents; do not follow links."""
    def onerror(error):
        warnings.append(str(error))
    for directory, dirs, names in os.walk(root, followlinks=False, onerror=onerror):
        kept = []
        for name in sorted(dirs):
            if name.casefold() == 'archive-dnr':
                continue
            try:
                if not is_link(Path(directory) / name):
                    kept.append(name)
            except OSError as error:
                warnings.append(str(error))
        dirs[:] = kept
        for name in sorted(names):
            if name.casefold() == 'archive-dnr' or not name.lower().endswith('.md'):
                continue
            path = Path(directory) / name
            try:
                if not is_link(path) and path.is_file():
                    yield path
            except OSError as error:
                warnings.append(str(error))


def quoted_scalar(raw):
    if raw.startswith('"'):
        value = json.loads(raw)  # documented double-quoted JSON-compatible YAML subset
        if not isinstance(value, str):
            raise ValueError('expected a quoted string')
    elif re.fullmatch(r"'(?:[^']|'')*'", raw):
        value = raw[1:-1].replace("''", "'")
    else:
        raise ValueError('expected a single-line quoted scalar; unsupported YAML')
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError('control characters and multiline values are unsupported')
    return value


def is_placeholder(value):
    return bool(re.fullmatch(r'\[[^\[\]]+\]', value) or
                re.search(r'(?:^|/)\[[^\[\]]+\](?:/|$)', value) or
                re.search(r'\{\{[^{}]+\}\}', value))


def metadata(path):
    data = {}
    try:
        with path.open('r', encoding='utf-8-sig') as stream:
            if stream.readline(HEADER_LIMIT + 1).rstrip('\r\n') != '---':
                return data, 'no frontmatter / unclassified', False
            consumed = 4
            for _ in range(HEADER_LINES):
                line = stream.readline(HEADER_LIMIT + 1)
                consumed += len(line)
                if not line or consumed > HEADER_LIMIT:
                    raise ValueError('unterminated or oversized frontmatter')
                if line.rstrip('\r\n') == '---':
                    break
                match = re.fullmatch(r'([a-z_]+):[ \t]*(.+?)[ \t]*\r?\n?', line)
                if not match:
                    raise ValueError('unsupported mapping syntax')
                key, raw = match.groups()
                if key not in FIELDS:
                    raise ValueError('unsupported field: ' + key)
                if key in data:
                    raise ValueError('duplicate field: ' + key)
                data[key] = quoted_scalar(raw)
            else:
                raise ValueError('frontmatter exceeds 64 lines')
        missing = REQUIRED - data.keys()
        if missing:
            raise ValueError('missing required fields: ' + ', '.join(sorted(missing)))
        template = any(is_placeholder(value) for value in data.values())
        for key, choices in (
                ('record', KINDS), ('state', {'active', 'historical', 'superseded'}),
                ('author', {'worker', 'coordinating-lead', 'reviewer', 'isaac', 'unknown'})):
            if not is_placeholder(data[key]) and data[key] not in choices:
                raise ValueError('invalid ' + key + ': ' + data[key])
        for key, cap in (('summary', 40), ('read_when', 25)):
            if len(data[key].split()) > cap:
                raise ValueError(f'{key} exceeds {cap} words')
        if not data['summary'] or not data['read_when']:
            raise ValueError('summary and read_when must be nonempty')
        if data['state'] == 'superseded' and not data.get('superseded_by'):
            raise ValueError('superseded state requires superseded_by')
        if data['state'] != 'superseded' and 'superseded_by' in data:
            raise ValueError('superseded_by is only valid for superseded state')
        if data['record'] == 'spec-log' and 'spec_revision' in data:
            raise ValueError('spec-log revisions belong in dated entries')
        if data['record'] in {'worker-report', 'review', 'phase-report'}:
            if not data.get('workflow_version') or not data.get('instruction_inventory'):
                raise ValueError('report requires workflow_version and instruction_inventory')
        return data, 'template' if template else data['state'], template
    except (OSError, UnicodeError, ValueError) as error:
        return data, 'malformed / unclassified: ' + str(error), False


def word_count(path):
    count, inside = 0, False
    try:
        with path.open('r', encoding='utf-8-sig') as stream:
            while True:
                chunk = stream.read(65536)
                if not chunk:
                    break
                for char in chunk:
                    if char.isspace():
                        inside = False
                    elif not inside:
                        count += 1
                        inside = True
        return str(count)
    except (OSError, UnicodeError):
        return 'unavailable'


def cell(value, limit=220):
    value = ''.join(char if char.isprintable() else ' ' for char in str(value))
    return value if len(value) <= limit else value[:limit - 1] + '…'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', default='.',
                        help='task root; with --all, project root (default: current directory)')
    parser.add_argument('--all', action='store_true', help='explicitly scan only docs/project, docs/adr, docs/external')
    parser.add_argument('--active', action='store_true', help='known active plus unclassified/malformed; exclude templates')
    parser.add_argument('--offset', type=int, default=0)
    parser.add_argument('--limit', type=int, default=20, help='rows per page, 1–100 (default: 20)')
    args = parser.parse_args(argv)
    if args.offset < 0 or not 1 <= args.limit <= 100:
        parser.error('offset must be nonnegative and limit must be between 1 and 100')
    try:
        root = safe_root(args.root)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    warnings, roots = [], [root]
    if args.all:
        roots = []
        for name in ('docs/project', 'docs/adr', 'docs/external'):
            try:
                roots.append(safe_root(root / name))
            except (OSError, ValueError) as error:
                warnings.append(f'{name}: {error}')
    rows, scanned, eligible = [], 0, 0
    for scan_root in roots:
        for path in walk_records(scan_root, warnings):
            scanned += 1
            data, lifecycle, template = metadata(path)
            if args.active and (template or lifecycle in {'historical', 'superseded'}):
                continue
            if args.offset <= eligible < args.offset + args.limit:
                rows.append([str(path.relative_to(root)).replace('\\', '/'),
                             data.get('record', '?'), data.get('task', '-'), data.get('cycle', '-'),
                             lifecycle, data.get('date', '-'), data.get('spec_revision', '-'),
                             word_count(path), data.get('summary', '-'), data.get('read_when', '-')])
            eligible += 1
    print('path\trecord\ttask\tcycle\tlifecycle\tdate\tspec revision\twords\tsummary\tread_when')
    for row in rows:
        print('\t'.join(cell(value) for value in row))
    remaining = max(0, eligible - args.offset - len(rows))
    print(f'Total scanned: {scanned}; eligible: {eligible}; shown: {len(rows)}; '
          f'omitted: {eligible - len(rows)} (before page: {min(args.offset, eligible)}; after: {remaining}).')
    if remaining:
        print(f'Next page: repeat this invocation with --offset {args.offset + len(rows)} --limit {args.limit}')
    print('Metadata routes reading; it does not establish acceptance. Cells over 220 characters are clipped.')
    for warning in warnings[:10]:
        print('Warning: ' + cell(warning))
    if len(warnings) > 10:
        print(f'{len(warnings) - 10} additional traversal warnings omitted; narrow the root to investigate.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
