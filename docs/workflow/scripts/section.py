#!/usr/bin/env python3
"""Read one complete Markdown section, or list headings. Python 3; no writes.

Also supplies the shared read-only primitives used by the other installed helpers.
Run from the project root. Refused/oversized input is never a completed read.
Exit 0: section printed, or the output states there is no such file or section.
Exit 2: refused. Exit 3: output printed with omitted sections named. Exit 1 is not used.
Long omitted identities are paged with --omissions-offset; concatenate the JSON fragments.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import stat
import subprocess
import sys

VERSION = '5.2.0'
READ_LIMIT = 2 * 1024 * 1024
OUTPUT_LIMIT = 24000
FENCE = re.compile(r'^ {0,3}(`{3,}|~{3,})([^\r\n]*)')


def fence_opener(line):
    """CommonMark opener; a backtick fence's info string cannot contain a backtick."""
    mark = FENCE.match(line)
    if mark and not (mark[1][0] == '`' and '`' in mark[2]):
        return mark
    return None


def fence_closes(line, fence):
    mark = FENCE.match(line)
    return bool(mark and mark[1][0] == fence[0] and len(mark[1]) >= len(fence) and not mark[2].strip())


def is_link(path):
    info = path.lstat()
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, 'st_file_attributes', 0) & getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0x400))


def safe_path(raw, kind=None, within=None):
    """Inspect every lexical ancestor before resolving, including before '..'."""
    path = Path(raw)
    if not path.is_absolute():
        path = Path.cwd() / path
    if any(p.casefold() == 'archive-dnr' for p in path.parts):
        raise ValueError('archive-dnr paths are excluded')
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        if is_link(current):
            raise ValueError('symlink/junction/reparse-point path or ancestor is excluded')
    path = path.resolve(strict=True)
    if within is not None and not path.is_relative_to(within):
        raise ValueError('path escapes the project root')
    if kind == 'file' and not path.is_file():
        raise ValueError('path must be a regular file')
    if kind == 'dir' and not path.is_dir():
        raise ValueError('root must be a directory')
    return path


def read(raw, root=None, keep_bom=False):
    path = safe_path(raw, 'file', root)
    with path.open('rb') as stream:
        data = stream.read(READ_LIMIT + 1)
    if len(data) > READ_LIMIT:
        raise ValueError(f'input exceeds {READ_LIMIT} bytes; use bounded native section reads: {path}')
    return data.decode('utf-8' if keep_bom else 'utf-8-sig').replace('\r\n', '\n').replace('\r', '\n')


def optional(raw, root=None):
    try:
        return read(raw, root)
    except FileNotFoundError:
        return ''


def mask_html_comments(text):
    """Blank comments without shifting offsets; markers in fenced code stay literal."""
    visible, commented, fence = [], False, None
    for line in text.splitlines(keepends=True):
        if fence:
            visible.append(line)
            if fence_closes(line, fence):
                fence = None
            continue
        if not commented:
            opener = fence_opener(line)
            if opener:
                visible.append(line)
                fence = opener[1]
                continue
        output = []
        i = 0
        while i < len(line):
            if commented:
                end = line.find('-->', i)
                if end < 0:
                    output.extend('\n' if c == '\n' else ' ' for c in line[i:])
                    i = len(line)
                else:
                    output.extend('\n' if c == '\n' else ' ' for c in line[i:end+3])
                    i = end + 3
                    commented = False
            elif line.startswith('<!--', i):
                commented = True
            else:
                output.append(line[i])
                i += 1
        masked = ''.join(output)
        visible.append(masked)
        mark = fence_opener(masked)
        if mark:
            fence = mark[1]
    return ''.join(visible)


def headings(text):
    """ATX and setext headings, excluding frontmatter and fenced code."""
    lines = mask_html_comments(text).splitlines(keepends=True)
    result, stack, fence = [], [], None
    front = bool(lines and lines[0].strip() == '---')
    offset = 0
    for n, line in enumerate(lines):
        stripped = line.strip()
        if front:
            if n and stripped == '---':
                front = False
            offset += len(line)
            continue
        if fence:
            if fence_closes(line, fence):
                fence = None
            offset += len(line)
            continue
        mark = fence_opener(line)
        if mark:
            fence = mark[1]
            offset += len(line)
            continue
        match = re.match(r'^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$', line)
        start, title, level = offset, '', 0
        if match:
            level, title = len(match[1]), match[2]
        elif n and re.fullmatch(r' {0,3}(?:=+|-+)\s*', line) and lines[n-1].strip() and not lines[n-1].lstrip().startswith(('|', '#', '-', '>', '`')):
            title, level = lines[n-1].strip(), 1 if stripped[0] == '=' else 2
            start -= len(lines[n-1])
        if title:
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, title))
            result.append({'title': title, 'level': level, 'start': start,
                           'path': ' > '.join(t for _, t in stack)})
        offset += len(line)
    for n, entry in enumerate(result):
        entry['end'] = next((e['start'] for e in result[n+1:] if e['level'] <= entry['level']), len(text))
    return result


def select(text, query):
    entries = headings(text)
    norm = lambda s: re.sub(r'[^\w]+', ' ', s.casefold()).strip()
    q = norm(query)
    found = [e for e in entries if q in (norm(e['title']), norm(e['path']))]
    if not found:
        found = [e for e in entries if q in norm(e['title'])]
    if not found:
        found = [e for e in entries if q in norm(e['path'])]
    if len(found) > 1:
        raise ValueError('ambiguous heading; candidates:\n' + '\n'.join(e['path'] for e in found[:30]) + ('\nAdditional candidates omitted; narrow the heading.' if len(found) > 30 else ''))
    if not found:
        return None
    e = found[0]
    return e, text[e['start']:e['end']].rstrip()


def get_section(text, title):
    found = select(text, title)
    return found[1] if found else ''


def utf8_output():
    """Print any record text: Windows pipes default to a code page that cannot hold it."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
        except (AttributeError, ValueError):
            pass


HEADING_KEYS = ('orient', 'plan', 'implement', 'verify', 'self-audit', 'review',
                'repair', 'complete', 'resume', 'communicate')
PROFILE = 'model-neutral-review-lanes-v2'
# Earlier profiles stay readable in historical inventories but never route current work.
LEGACY_PROFILES = {'model-neutral-conditional-closure-v1': '5.0.0', 'model-neutral-review-lanes-v1': '5.1.0'}
CONTEXT_LABELS = {
    'Shared facts and conventions': 'shared_facts_and_conventions',
    'Additional context': 'additional_context',
    'Ordinary tasks': 'ordinary_tasks',
    'Existing phase-status authority': 'existing_phase_status_authority',
}
FIELD_LABELS = {
    'Verification delegation': 'verification_delegation',
    'Storage policy': 'storage_policy',
    'Local task-branch commits at handoff': 'local_task_branch_commits',
    'Execution profiles': 'execution_profiles',
    'Enforced boundaries': 'enforced_boundaries',
    'Checkout and worktree support': 'checkout_worktree_support',
}


def exact_h2_section(text, title):
    """Return one complete ATX H2 section outside fences, with exact title."""
    matches = [e for e in headings(text) if e['level'] == 2 and e['title'] == title
               and re.match(r'^ {0,3}##\s+', text[e['start']:])]
    if len(matches) != 1:
        listing = ', '.join(e['path'] for e in headings(text)[:30])
        raise ValueError(f'exact H2 {title!r} requires one ATX section (found {len(matches)}); '
                         f'headings: {listing}. Use section.py --list and bounded direct reads.')
    e = matches[0]
    return text[e['start']:e['end']].rstrip()


def exact_h2_or_none(text, title):
    """Like exact_h2_section, but an absent section is None, so callers report it as missing."""
    if not any(e['level'] == 2 and e['title'] == title and re.match(r'^ {0,3}##\s+', text[e['start']:])
               for e in headings(text)):
        return None
    return exact_h2_section(text, title)


def _strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate JSON key: ' + key)
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs)


def _trim_scalars(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return [_trim_scalars(x) for x in value]
    if isinstance(value, dict):
        return {k: _trim_scalars(v) for k, v in value.items()}
    return value


def _one_json(section):
    lines = mask_html_comments(section).splitlines(keepends=True)
    blocks, fence, body, is_json = [], None, [], False
    for line in lines:
        if fence:
            if fence_closes(line, fence):
                if is_json:
                    blocks.append(''.join(body))
                fence, body, is_json = None, [], False
            elif is_json:
                body.append(line)
            continue
        mark = fence_opener(line)
        if mark:
            fence = mark[1]
            is_json = mark[2].strip() == 'json'
            body = []
    if fence and is_json:
        raise ValueError('unclosed fenced json configuration block')
    if len(blocks) != 1:
        raise ValueError('configuration section requires exactly one visible fenced json block')
    return _strict_json(blocks[0])


def _relative_file(value):
    if not isinstance(value, str) or not value or value.strip() != value:
        raise ValueError('configuration path must be nonempty repository-relative text')
    if re.search(r'[\x00-\x1f\x7f|<>\[\]{}]', value) or '\\' in value or ':' in value:
        raise ValueError('unsafe configuration path: ' + value[:100])
    parts = value.split('/')
    if value.startswith('/') or any(p in ('', '.', '..') or p.casefold() == 'archive-dnr' for p in parts):
        raise ValueError('unsafe configuration path: ' + value[:100])
    return value


def _visible_prose(text):
    """Discard fenced examples and HTML comments before reading anchored fields."""
    text = mask_html_comments(text)
    visible, fence = [], None
    for line in text.splitlines():
        if fence:
            if fence_closes(line, fence):
                fence = None
            continue
        mark = fence_opener(line)
        if mark:
            fence = mark[1]
        else:
            visible.append(line)
    return '\n'.join(visible)


def _field(text, label):
    hits = re.findall(r'(?m)^(?:- )?' + re.escape(label) + r':[ \t]*(.*)$', _visible_prose(text))
    if len(hits) > 1:
        raise ValueError('duplicate configuration field: ' + label)
    return hits[0].strip() if hits else None


def legacy_profile(value):
    return isinstance(value, str) and value in LEGACY_PROFILES


def refresh_required(profile):
    return (f'refresh required: authority profile {profile} is the {LEGACY_PROFILES[profile]} profile; '
            f'these {VERSION} helpers route only {PROFILE}. Re-render README and update the helpers '
            'together in one generate-init refresh.')


def canonical_effective_inventory(value):
    """Validate the entire supported v5 effective-object schema before comparison."""
    value = _trim_scalars(value)
    keys = {'schema_version', 'process_configuration', 'selected_references',
            'context_and_state_owners', 'storage_policy', 'verification_delegation',
            'local_task_branch_commits', 'execution_profiles', 'enforced_boundaries',
            'checkout_worktree_support'}
    if not isinstance(value, dict) or set(value) != keys or type(value['schema_version']) is not int or value['schema_version'] != 1:
        raise ValueError('unsupported effective configuration schema')
    process = value['process_configuration']
    required = {'schema_version', 'process', 'self_audit', 'self_audit_template',
                'headings', 'authority_profile'}
    if not isinstance(process, dict) or set(process) != required or type(process['schema_version']) is not int or process['schema_version'] != 1 or (process['authority_profile'] != PROFILE and not legacy_profile(process['authority_profile'])):
        raise ValueError('unsupported nested process configuration schema/profile')
    for key in ('process', 'self_audit', 'self_audit_template'):
        _relative_file(process[key])
    hm = process['headings']
    if not isinstance(hm, dict) or set(hm) != set(HEADING_KEYS):
        raise ValueError('heading map has missing or unknown keys')
    vals = list(hm.values())
    if any(not isinstance(v, str) or not v or '\n' in v or '\r' in v or '|' in v or any(ord(c) < 32 for c in v) for v in vals) or len(set(vals)) != len(vals):
        raise ValueError('headings must be nonempty, distinct, single-line exact titles')
    refs = value['selected_references']
    if not isinstance(refs, list):
        raise ValueError('selected_references must be a list')
    for ref in refs:
        if not isinstance(ref, dict) or set(ref) != {'path', 'applies_to'} or not isinstance(ref['applies_to'], str) or not ref['applies_to']:
            raise ValueError('malformed selected reference object')
        _relative_file(ref['path'])
    if len({r['path'] for r in refs}) != len(refs):
        raise ValueError('duplicate selected reference')
    value['selected_references'] = sorted(refs, key=lambda r: r['path'])
    context = value['context_and_state_owners']
    if not isinstance(context, dict) or set(context) != set(CONTEXT_LABELS.values()) or any(v is not None and not isinstance(v, str) for v in context.values()):
        raise ValueError('malformed context/state owners')
    if value['storage_policy'] not in ('docs tracked', 'docs ignored') or value['verification_delegation'] not in ('enabled', 'disabled'):
        raise ValueError('unsupported storage/delegation configuration')
    for key in ('local_task_branch_commits', 'execution_profiles', 'enforced_boundaries', 'checkout_worktree_support'):
        if value[key] is not None and (not isinstance(value[key], str) or not value[key]):
            raise ValueError('malformed optional configuration field: ' + key)
    return value


def parse_config(config_text, root=None):
    """Parse the one supported v5 README grammar into effective inventory facts."""
    section = exact_h2_section(config_text, 'Process configuration')
    process = _trim_scalars(_one_json(section))
    required = {'schema_version', 'process', 'self_audit', 'self_audit_template',
                'headings', 'authority_profile'}
    if not isinstance(process, dict) or set(process) != required:
        raise ValueError('process configuration has missing or unknown keys')
    if legacy_profile(process['authority_profile']):
        raise ValueError(refresh_required(process['authority_profile']))
    if type(process['schema_version']) is not int or process['schema_version'] != 1 or process['authority_profile'] != PROFILE:
        raise ValueError('unsupported process schema or authority profile')
    for key in ('process', 'self_audit', 'self_audit_template'):
        _relative_file(process[key])
    hm = process['headings']
    if not isinstance(hm, dict) or set(hm) != set(HEADING_KEYS):
        raise ValueError('heading map has missing or unknown keys')
    vals = list(hm.values())
    if any(not isinstance(v, str) or not v or v != v.strip() or '\n' in v or '\r' in v or '|' in v or any(ord(c) < 32 for c in v) for v in vals) or len(set(vals)) != len(vals):
        raise ValueError('headings must be nonempty, distinct, single-line exact titles')
    refs_section = exact_h2_section(config_text, 'Selected project references')
    refs_section = _visible_prose(refs_section)
    none = bool(re.search(r'(?m)^None: generic project\.$', refs_section))
    table = rows(refs_section)
    refs = []
    if none:
        if table:
            raise ValueError('None reference selection conflicts with table')
    else:
        if len(table) < 3 or cells(table[0]) != ['File', 'Applies to'] or not all(re.fullmatch(r':?-{3,}:?', x) for x in cells(table[1])):
            raise ValueError('selected references require File | Applies to table or exact None: generic project.')
        for row in table[2:]:
            parts = cells(row)
            if len(parts) != 2 or not parts[1]:
                raise ValueError('malformed reference row')
            refs.append({'path': _relative_file(parts[0]), 'applies_to': parts[1]})
        if len({r['path'] for r in refs}) != len(refs):
            raise ValueError('duplicate selected reference')
    context = exact_h2_section(config_text, 'Project context and existing state owners')
    context_values = {out: _field(context, label) for label, out in CONTEXT_LABELS.items()}
    fields = {out: _field(config_text, label) for label, out in FIELD_LABELS.items()}
    if fields['verification_delegation'] is None:
        fields['verification_delegation'] = 'disabled'
    if fields['verification_delegation'] not in ('enabled', 'disabled'):
        raise ValueError('Verification delegation must be enabled|disabled')
    if fields['storage_policy'] not in ('docs tracked', 'docs ignored'):
        raise ValueError('Storage policy must be docs tracked|docs ignored')
    for key in ('local_task_branch_commits', 'execution_profiles', 'enforced_boundaries', 'checkout_worktree_support'):
        if fields[key] == '':
            raise ValueError('empty configuration field: ' + key)
    effective = {'schema_version': 1, 'process_configuration': process,
                 'selected_references': sorted(refs, key=lambda r: r['path']),
                 'context_and_state_owners': context_values, **fields}
    if root is not None:
        for path in [process[k] for k in ('process', 'self_audit', 'self_audit_template')] + [r['path'] for r in refs]:
            safe_path(Path(root)/path, 'file', root)
    return canonical_effective_inventory(effective)


STATUS_LABELS = ('Current implementation report', 'Current repair report', 'Final repair snapshot')


def parse_status_pointers(status):
    """None means a legacy Status with no complete explicit routing."""
    if not status:
        return None
    # Fenced examples are prose, not authority-bearing Status fields.
    visible, fence = [], None
    for line in mask_html_comments(status).splitlines():
        if fence:
            if fence_closes(line, fence):
                fence = None
            continue
        mark = fence_opener(line)
        if mark:
            fence = mark[1]
        else:
            visible.append(line)
    status = '\n'.join(visible)
    found = {}
    for label in STATUS_LABELS:
        matches = re.findall(r'(?m)^- ' + re.escape(label) + r': ([^\r\n]*)$', status)
        mentions = re.findall(r'(?m)^\s*-\s*' + re.escape(label) + r'\b.*$', status)
        if len(matches) != len(mentions) or len(matches) > 1:
            raise ValueError('duplicate or malformed Status pointer: ' + label)
        if matches:
            found[label] = matches[0]
    if not found:
        return None
    if len(found) != 3:
        raise ValueError('partial explicit Status report pointers')
    impl, repair, snapshot = (found[k] for k in STATUS_LABELS)
    for value in (impl, repair):
        if value != 'none':
            _relative_file(value)
    if snapshot != 'not applicable':
        if not snapshot or snapshot.strip() != snapshot or any(ord(c) < 32 or ord(c) == 127 for c in snapshot) or len(snapshot) > 300:
            raise ValueError('invalid final repair snapshot')
    if (repair == 'none') != (snapshot == 'not applicable') or (repair != 'none' and impl == 'none'):
        raise ValueError('inconsistent repair report and final snapshot pointers')
    return {'implementation': impl, 'repair': repair, 'snapshot': snapshot}


def cells(line):
    return [s.strip().strip('`') for s in re.split(r'(?<!\\)\|', line.strip().strip('|'))]


def rows(text):
    return [line for line in text.splitlines() if line.lstrip().startswith('|')]


PLACEHOLDER_ID = re.compile(r'\[[^\[\]]+\]|\{\{[^{}]+\}\}')


def data_rows(text):
    table = rows(text)
    result, header = [], False
    for line in table:
        parts = cells(line)
        if all(re.fullmatch(r':?-{3,}:?', p) for p in parts):
            header = True
            continue
        # Only a literal template placeholder is skipped; a linked ID such as [F-2](path) is a real row.
        if header and not (parts and PLACEHOLDER_ID.fullmatch(parts[0])):
            result.append(line)
    return result


class Packet:
    """Bounded output. Never silently truncates a logical section, acceptance row or evidence row."""
    RESERVE = 700  # room for the final omitted-sections line

    def __init__(self, limit=OUTPUT_LIMIT, omissions_offset=0):
        self.limit, self.used, self.omitted = limit, 0, []
        self.omissions_offset = omissions_offset

    def add(self, label, body):
        value = f'\n## {label}\n{body or "Nothing to report."}\n'
        if self.used + len(value) > self.limit - self.RESERVE:
            self.omit(label)
            return False
        print(value, end='')
        self.used += len(value)
        return True

    def omit(self, label):
        self.omitted.append(str(label))

    def finish(self):
        """Page complete identities as JSON fragments; never discard any part of a label."""
        if not self.omitted:
            return 0
        readable = '; '.join(name if name.isprintable() else repr(name) for name in self.omitted)
        if len(readable) <= self.RESERVE - 300 and not self.omissions_offset:
            print('\nINCOMPLETE: omitted sections: ' + readable + '. Read each complete section separately; this packet is not acceptance evidence.')
            return 3
        identities = json.dumps(self.omitted, ensure_ascii=True)
        start = self.omissions_offset
        end = min(start + self.RESERVE - 300, len(identities))
        print('\nRead complete sections separately; this packet is not acceptance evidence.')
        print('Omitted identities JSON fragment: ' + identities[start:end])
        if end < len(identities):
            print(f'Repeat this invocation with --omissions-offset {end}; concatenate JSON fragments in order.')
        print(f'INCOMPLETE: omitted sections: identities JSON characters {start}:{end} of {len(identities)} shown above.')
        return 3


def add_rows(packet, label, table, limit=30):
    items = list(table)
    printed = packet.add(label, '\n'.join(items[:limit]) + (f'\nINCOMPLETE: {len(items)-limit} rows omitted; narrow the task or read the source section.' if len(items) > limit else ''))
    if printed and len(items) > limit:
        packet.omit(f'{label} ({len(items) - limit} rows)')


def record_api():
    # run_path does not emit __pycache__; do not import sibling modules.
    return runpy.run_path(str(safe_path(Path(__file__).with_name('record-index.py'), 'file')))


def setup(root_raw='.'):
    root = safe_path(root_raw, 'dir')
    config = read(root/'docs/workflow/README.md', root)
    return root, config


def references(config):
    return [r['path'] for r in parse_config(config)['selected_references']]


def workflow_routes(root, effective, activity):
    """Validate every routing target before callers emit a normal packet."""
    cfg = effective['process_configuration']
    process = read(root/cfg['process'], root)
    titles = [cfg['headings'][key] for key in ('orient', activity, 'communicate')]
    selected = {title: exact_h2_section(process, title) for title in titles}
    audit = read(root/cfg['self_audit'], root)
    exact_h2_section(audit, 'Audit method')
    read(root/cfg['self_audit_template'], root)
    for ref in effective['selected_references']:
        read(root/ref['path'], root)
    return selected


def validate_status_reports(root, spec_meta, pointers):
    """Validate explicit report pair identities and return classified metadata."""
    if pointers is None:
        return None, None, []
    api = record_api()
    def report(value, kinds):
        if value == 'none':
            return None, None
        path = safe_path(root/value, 'file', root)
        meta, state, template = api['metadata'](path)
        if template or 'unclassified' in state or meta.get('record') not in kinds:
            raise ValueError('Status points to unclassified/wrong-kind report: ' + value)
        if not spec_meta.get('task') or meta.get('task') != spec_meta.get('task'):
            raise ValueError('Status report task does not match task spec: ' + value)
        return path, meta
    try:
        impl_path, impl = report(pointers['implementation'], {'worker-report', 'implementation-report'})
        repair_path, repair = report(pointers['repair'], {'review'})
    except FileNotFoundError as error:
        raise ValueError('Status report pointer is missing: ' + str(error)) from error
    notices = []
    if impl:
        if not impl.get('spec_revision'):
            raise ValueError('implementation report lacks spec revision')
        if repair:
            if not repair.get('spec_revision') or repair['spec_revision'] != impl['spec_revision']:
                raise ValueError('repair pair original spec revisions do not match')
            notices.append('INCOMPLETE: final repair evidence is in ' + pointers['repair'] +
                           ' :: Repair and final verification; read it directly. Final repair snapshot ' +
                           pointers['snapshot'] + ' is an unverified claim.')
            if impl['spec_revision'] != spec_meta.get('spec_revision'):
                notices.append('INCOMPLETE: original revision ' + impl['spec_revision'] +
                               ' differs from current revision ' + str(spec_meta.get('spec_revision') or 'missing') +
                               '; validate final spec revision, snapshot and receipts in repair section directly.')
        elif impl['spec_revision'] != spec_meta.get('spec_revision'):
            raise ValueError('implementation report revision does not match current spec')
    return impl_path, impl, notices


def status_routing(root, spec_path, spec):
    """The task-record checks brief.py applies before a packet; doctor runs the same routine.

    Raises ValueError naming the refusal. Returns (meta, phase, status, pointers, notices);
    status is None when the spec has no exact '## Status' section, which is reported, not refused.
    """
    meta, lifecycle, template = record_api()['metadata'](spec_path)
    if template or 'unclassified' in lifecycle:
        raise ValueError('task/direction frontmatter is unclassified; inspect directly')
    if meta.get('record') == 'direction':
        return meta, True, None, None, []
    if meta.get('record') != 'spec':
        raise ValueError('task input must classify as spec or explicit direction')
    status = exact_h2_or_none(spec, 'Status')
    pointers = parse_status_pointers(status)
    _, _, notices = validate_status_reports(root, meta, pointers)
    get_section(spec, 'Product and acceptance criteria')  # an ambiguous heading refuses here, for both callers
    return meta, False, status, pointers, notices


def task_spec(root, task):
    # Task identifiers or explicit repository-relative task/spec paths only.
    supplied = Path(task)
    if supplied.is_absolute() or '..' in supplied.parts:
        raise ValueError('task must be an ID or repository-relative task/spec path')
    path = root / (task if '/' in task or '\\' in task else 'docs/project/tasks/' + task)
    if path.suffix.lower() != '.md':
        path /= 'spec.md'
    return safe_path(path, 'file', root)


def ledger(root, task=None, keywords=()):
    """Open rows, Closed/archive class matches, searched classes, and notices naming missing tables."""
    notices = []
    main = optional(root/'docs/project/findings-ledger.md', root)

    def table(title):
        if not main:
            return []
        section = exact_h2_or_none(main, title)
        if section is None:
            notices.append(f'docs/project/findings-ledger.md :: {title} section missing; inspect the ledger directly.')
            return []
        return data_rows(section)
    opened = table('Open')
    if task:
        opened = [row for row in opened if re.search(r'(?<![\w-])'+re.escape(task)+r'(?![\w-])', row, re.I)]
    classes = set(k.casefold() for k in keywords)
    classes.update(cells(row)[2].casefold() for row in opened if len(cells(row)) > 2)
    closed = table('Closed')
    archive = optional(root/'docs/project/findings-ledger-archive.md', root)
    history = [('Closed', row) for row in closed] + [('Archive', row) for row in data_rows(archive)]
    matched = [kind + ': ' + row for kind, row in history if len(cells(row)) > 2 and any(k in cells(row)[2].casefold() for k in classes)]
    return opened, matched, classes, notices


class GitUnavailable(OSError):
    """The git executable could not be started: reported as such, never as a missing repository."""


def printable(value):
    return value if value.isprintable() else repr(value)


def git(root, *args, input=None, raw=False):
    # Require this explicit project root, not an accidentally discovered parent.
    safe_path(root/'.git', within=root)
    env = os.environ.copy()
    env['GIT_OPTIONAL_LOCKS'] = '0'
    env['GIT_NO_LAZY_FETCH'] = '1'  # a partial clone must fail on a missing object, never fetch or prompt
    try:
        result = subprocess.run(['git', '--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', str(root), *args],
                                input=input, capture_output=True, timeout=20, env=env)
    except FileNotFoundError as error:
        raise GitUnavailable('git executable not found; no Git check ran') from error
    return result.returncode, result.stdout if raw else result.stdout.decode('utf-8', 'replace'), result.stderr.decode('utf-8', 'replace')


def safe_git_tree(root):
    """Refuse only on a link, junction or reparse point Git would visit; return submodule paths.

    Git's working-tree scans follow junctions, so each directory is cleared before any such
    scan. The walk never follows links. Before descending it prunes .git, archive-dnr at any
    depth, submodules (returned, never scanned) and every directory Git ignores, asked with one
    batched check-ignore per depth. An ignored directory holding tracked paths is still walked,
    because Git visits tracked paths whatever the ignore rules say.
    """
    code, output, error = git(root, 'ls-files', '-s', '-z')
    if code:
        raise ValueError('Git tree inspection refused: the index could not be listed: ' + error.strip()[:200])
    submodules, tracked_dirs = [], set()
    for entry in output.split('\x00'):
        info, _, path = entry.partition('\t')
        if not path:
            continue
        if info.startswith('160000 '):
            submodules.append(path)
        parts = path.split('/')
        tracked_dirs.update('/'.join(parts[:n]) for n in range(1, len(parts)))
    skip = set(submodules)
    level = ['']
    while level:
        children = []
        for rel in level:
            try:
                entries = sorted(os.scandir(root / rel if rel else root), key=lambda e: e.name)
            except OSError as err:
                raise ValueError('Git tree inspection refused: cannot list ' + printable(rel or '.') + ': ' + str(err.strerror or err))
            for entry in entries:
                child = f'{rel}/{entry.name}' if rel else entry.name
                if entry.name == '.git' or entry.name.casefold() == 'archive-dnr' or child in skip:
                    continue
                linked = is_link(Path(entry.path))
                if linked or entry.is_dir(follow_symlinks=False):
                    children.append((child, linked))
        if not children:
            break
        # check-ignore reads its input as pathspecs, so a leading ':' could name another path; such entries are walked.
        query = [c for c, _ in children if not c.startswith(':')]
        code, output, error = git(root, 'check-ignore', '--stdin', '-z', input='\x00'.join(query).encode('utf-8')) if query else (1, '', '')
        if code not in (0, 1):
            raise ValueError('Git tree inspection refused: git check-ignore failed for entries below ' +
                             printable(children[0][0].rpartition('/')[0] or '.') + ': ' + error.strip()[:200])
        ignored = set(p for p in output.split('\x00') if p)
        level = []
        for child, linked in children:
            if child in ignored and child not in tracked_dirs:
                continue
            if linked:
                raise ValueError('Git tree inspection refused: link/junction/reparse point that Git would visit: ' +
                                 printable(child) + '. Inspect the diff directly with bounded reads.')
            level.append(child)
    return sorted(submodules)


SAFE_DRIVER = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]*')


def filter_exclusions(root, scope):
    """Exclude every clean or process filter driver's paths; return (pathspecs, one line per driver in use).

    Git runs such a driver to compare working-tree content, even for an unmodified file, so its
    paths are excluded before any working-tree diff and the filter never runs. Reading
    configuration and listing paths by attribute runs nothing. scope is the caller's pathspec.
    """
    code, output, error = git(root, 'config', '-z', '--get-regexp', r'^filter\.')
    if code not in (0, 1):
        raise ValueError('filter configuration unreadable: ' + error.strip()[:200])
    drivers = set()
    for entry in output.split('\x00'):
        key, _, command = entry.partition('\n')
        name, _, variable = key[len('filter.'):].rpartition('.')
        if name and command and variable in ('clean', 'process'):
            drivers.add(name)
    scope_excludes = [p for p in scope if p.startswith(':(exclude')]
    excludes, lines, unsafe = [], [], []
    for name in sorted(drivers):
        if not SAFE_DRIVER.fullmatch(name):
            unsafe.append(name)
            continue
        code, output, error = git(root, 'ls-files', '-z', '--', f':(attr:filter={name})', *scope_excludes)
        if code:
            raise ValueError('filter attribute listing failed: ' + error.strip()[:200])
        excludes.append(f':(exclude,attr:filter={name})')
        count = len([p for p in output.split('\x00') if p])
        if count:
            lines.append(f'filter driver {name}: {count} tracked path(s) excluded; their content is not inspected and the filter never runs')
    if unsafe:
        # A name a pathspec cannot carry can only be checked path by path.
        code, output, error = git(root, 'ls-files', '-z', '--', *scope)
        if code:
            raise ValueError('tracked path listing failed: ' + error.strip()[:200])
        paths = [p for p in output.split('\x00') if p]
        if any('�' in p for p in paths):
            raise ValueError('a tracked path is not UTF-8, so filter driver ' + printable(unsafe[0]) +
                             ' cannot be checked; inspect the diff directly')
        code, output, error = git(root, 'check-attr', '-z', '--stdin', 'filter', input='\x00'.join(paths).encode('utf-8'))
        if code:
            raise ValueError('filter attribute check failed: ' + error.strip()[:200])
        fields = output.split('\x00')
        hits = [(fields[i], fields[i + 2]) for i in range(0, len(fields) - 2, 3) if fields[i + 2] in unsafe]
        if hits:
            names = ', '.join(printable(name) for name in sorted({driver for _, driver in hits}))
            raise ValueError(f'filter driver {names} applies to {len(hits)} tracked path(s) and its name cannot be excluded '
                             'by pathspec; comparing the working tree would run it, so nothing was scanned. '
                             'Inspect the diff directly. First path: ' + printable(hits[0][0]))
    return excludes, lines


def lf_hash(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def main(argv=None):
    utf8_output()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('file')
    parser.add_argument('heading', nargs='?')
    parser.add_argument('--list', action='store_true', help='headings only (up to 100; use --offset)')
    parser.add_argument('--offset', type=int, default=0)
    parser.add_argument('--omissions-offset', type=int, default=0, help='character offset in omitted identities JSON')
    args = parser.parse_args(argv)
    if args.offset < 0 or args.omissions_offset < 0:
        parser.error('offset must be nonnegative')
    try:
        source = read(args.file)
        packet = Packet(omissions_offset=args.omissions_offset)
        if args.list:
            all_headings = headings(source)
            packet.add(str(args.file), '\n'.join(e['path'] for e in all_headings[args.offset:args.offset+100]))
            packet.add('Heading totals', f'{len(all_headings)} headings; offset {args.offset}; next offset {args.offset+100} if more remain.')
        elif not args.heading:
            parser.error('name a heading or use --list')
        else:
            selected = select(source, args.heading)
            packet.add(f'{args.file} :: {selected[0]["path"]}' if selected else str(args.file), selected[1] if selected else 'No matching section; use --list.')
        return packet.finish()
    except FileNotFoundError:
        print(f'Nothing to report: no file at {args.file}.')
        return 0
    except (OSError, UnicodeError, ValueError) as error:
        print('Refused: ' + str(error)[:2000], file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
