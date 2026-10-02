#!/usr/bin/env python3
"""Read-only reviewer inputs; excludes author narratives. Never proves a snapshot.

--snapshot names a Git base ref for current-tree comparison or a repo-relative
manifest without Git. --report resolves ambiguous report candidates explicitly.
Use --class-keyword to extend recurrence lookup beyond classes in open findings.
Exit 0: packet complete, or the output states the task has no records yet.
Exit 2: refused, a required input missing, or a Git error or timeout.
Exit 3: packet printed with omitted sections named. Exit 1 is not used.
Long omitted identities are paged with --omissions-offset; concatenate the JSON fragments.
"""
import argparse
from pathlib import Path
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


def report_for(h, root, spec_path, spec, explicit):
    api = h['record_api']()
    meta, state, template = api['metadata'](spec_path)
    if template or 'unclassified' in state or meta.get('record') not in ('spec', 'direction'):
        raise ValueError('task input must be a classified spec or direction; inspect directly')
    phase = meta['record'] == 'direction'
    if phase:
        if not explicit:
            return None, {}, ['Phase direction requires explicit --report; no auto-discovery. Read actual phase owner and direction directly.']
        if not meta.get('spec_revision'):
            raise ValueError('direction revision missing; inspect identity directly')
        h['_relative_file'](explicit)
        path = h['safe_path'](root/explicit, 'file', root)
        data, lifecycle, placeholder = api['metadata'](path)
        if placeholder or 'unclassified' in lifecycle or data.get('record') not in ('phase-report', 'implementation-report'):
            raise ValueError('explicit phase report is unclassified or wrong kind')
        if not data.get('spec_revision') or data['spec_revision'] != meta['spec_revision']:
            raise ValueError('phase direction/report revision mismatch or missing revision')
        for key in ('task', 'cycle'):
            if meta.get(key) and data.get(key) and meta[key] != data[key]:
                raise ValueError('phase direction/report ' + key + ' mismatch')
        notices = [key + ' unbound on direction or report; do not infer identity.' for key in ('task', 'cycle') if not meta.get(key) or not data.get(key)]
        notices.append('Phase currentness/repair routing remains in existing phase owner and explicit reports; required phase machine audit remains a gate.')
        return path, data, notices
    status = h['exact_h2_or_none'](spec, 'Status') or ''
    pointers = h['parse_status_pointers'](status)
    pointed_path, pointed_meta, notices = h['validate_status_reports'](root, meta, pointers)
    if pointers is None:
        notices.append('INCOMPLETE: current repair-evidence routing is unverified; inspect Status and latest handoff directly.')
    if explicit:
        h['_relative_file'](explicit)
        path = h['safe_path'](root/explicit, 'file', root)
        if pointers and pointers['implementation'] != 'none' and path != pointed_path:
            raise ValueError('explicit --report conflicts with Current implementation report pointer')
        data, lifecycle, template = api['metadata'](path)
        if template or data.get('record') not in ('worker-report', 'implementation-report') or 'unclassified' in lifecycle:
            raise ValueError('explicit report is not a classified implementation report; inspect it directly')
        expected_revision = pointed_meta['spec_revision'] if pointed_meta and pointers and pointers['repair'] != 'none' else meta.get('spec_revision')
        if data.get('task') != meta.get('task') or data.get('spec_revision') != expected_revision:
            raise ValueError('explicit report task/revision does not match spec; inspect historical evidence directly')
        return path, data, notices
    if pointers:
        if pointed_path:
            return pointed_path, pointed_meta, notices
        return None, {}, notices + ['Current implementation report: none; no receipt selected.']
    reports = spec_path.parent/'reports'
    try:
        h['safe_path'](reports, 'dir', root)
    except FileNotFoundError:
        return None, {}, notices + ['No implementation reports yet.']
    candidates = []
    warnings = []
    for path in api['walk_records'](reports, warnings):
        data, lifecycle, template = api['metadata'](path)
        if template:
            continue
        if 'unclassified' in lifecycle:
            notices.append(str(path.relative_to(root)) + ': ' + lifecycle)
        elif data.get('record') in ('worker-report', 'implementation-report') and data.get('task') == meta.get('task') and data.get('spec_revision') == meta.get('spec_revision') and lifecycle == 'active':
            candidates.append((path, data))
    # Prefer an explicit Status pointer; never infer the latest evidence from mtime.
    legacy_pointed = [pair for pair in candidates if pair[0].relative_to(root).as_posix() in status.replace('\\', '/')]
    if len(legacy_pointed) == 1:
        return *legacy_pointed[0], notices + warnings
    if len(candidates) == 1:
        return *candidates[0], notices + warnings
    notices += ['Report selection unresolved: use --report with the current handoff; lifecycle/date alone do not establish freshness.']
    notices += [str(path.relative_to(root)) for path, _ in candidates]
    return None, {}, notices + warnings


def manifest(h, packet, root, candidate, reason):
    """Without Git, a snapshot is a manifest only when it names a repository file."""
    label = 'Snapshot comparison (' + reason + ')'
    if not candidate:
        packet.omit(label + ': no manifest identified; supply --snapshot <repository-relative manifest>')
        return
    try:
        h['_relative_file'](candidate)
        path = h['safe_path'](root/candidate, 'file', root)
    except FileNotFoundError:
        path = None
    except ValueError as error:
        if 'configuration path' not in str(error):
            raise  # a link, archive-dnr or escaping path is refused, not read
        path = None
    if path is None:
        packet.omit(label + ': ' + h['printable'](candidate) + ' is not a repository file; a commit id needs Git')
        return
    packet.add('Snapshot manifest — ' + str(path.relative_to(root)), h['read'](path, root))


def entries(output):
    """(status, paths) pairs from name-status -z output; renames and copies carry two paths."""
    tokens, result, i = output.split('\x00'), [], 0
    while i < len(tokens) and tokens[i]:
        count = 2 if tokens[i][:1] in 'RC' else 1
        result.append((tokens[i], tokens[i + 1:i + 1 + count]))
        i += 1 + count
    return result


def content_changed(h, root, args):
    """Paths whose content differs, from --numstat, which compares content and never refreshes the index."""
    code, output, error = h['git'](root, *args)
    if code:
        raise ValueError('content comparison failed: ' + error.strip()[:300])
    tokens, paths, i = output.split('\x00'), set(), 0
    while i < len(tokens):
        fields = tokens[i].split('\t')
        if len(fields) == 3 and fields[2]:
            paths.add(fields[2])
            i += 1
        elif len(fields) == 3:  # a rename or copy: both paths follow
            paths.update(tokens[i + 1:i + 3])
            i += 3
        else:
            i += 1
    return paths


def changes(h, packet, root, snapshot, report_meta):
    try:
        code, _, error = h['git'](root, 'rev-parse', '--show-toplevel')
    except h['GitUnavailable'] as unavailable:
        return manifest(h, packet, root, snapshot or report_meta.get('snapshot'), str(unavailable))
    except FileNotFoundError:
        return manifest(h, packet, root, snapshot or report_meta.get('snapshot'), 'no Git repository at the root')
    if code:
        raise ValueError('Git error: ' + error.strip()[:300])
    ref = snapshot or 'HEAD'
    if ref.startswith('-') or any(c in ref for c in '\r\n\x00'):
        raise ValueError('invalid snapshot ref')
    submodules = h['safe_git_tree'](root)
    code, commit, error = h['git'](root, 'rev-parse', '--verify', '--end-of-options', ref + '^{commit}')
    if code:
        raise ValueError('snapshot does not resolve to a commit; use a reproducible baseline: ' + error[:300])
    commit = commit.strip()
    packet.add('Git comparison identity', f'Base: {commit}; target: current tracked tree plus staged/unstaged/untracked paths. This is a reading summary, not an immutable snapshot or proof of the report\'s historical tree.')
    # Exclusions keep Git from diffing forbidden archive contents, and from running any clean or process filter.
    pathspec = ['.', ':(exclude,icase)**/archive-dnr/**', ':(exclude,icase)archive-dnr/**',
                ':(exclude,icase)**/archive-dnr', ':(exclude,icase)archive-dnr']
    excludes, filter_lines = h['filter_exclusions'](root, pathspec)
    pathspec += excludes
    # No index refresh: a stat-only change would otherwise rewrite the index and run its hook.
    # Ignoring dirty submodules keeps Git from running status, and their filters, inside them.
    diff = ['-c', 'core.quotePath=false', '-c', 'diff.autoRefreshIndex=false', 'diff', '--no-ext-diff', '--no-textconv',
            '--no-color', '--ignore-submodules=dirty']
    for label, args, base in [
        ('Diff stat against base', [*diff, '--stat', commit, '--', *pathspec], None),
        ('Tracked changed paths against base', [*diff, '--name-status', '-z', '-M', commit, '--', *pathspec], [commit]),
        ('Staged paths (including changes cancelled by unstaged edits)', [*diff, '--cached', '--name-status', '-z', '-M', commit, '--', *pathspec], None),
        ('Unstaged paths', [*diff, '--name-status', '-z', '-M', '--', *pathspec], []),
        ('Untracked paths', ['ls-files', '--others', '--exclude-standard', '-z', '--', *pathspec], None)]:
        code, output, error = h['git'](root, *args)
        if code:
            raise ValueError(label + ' failed: ' + error.strip()[:300])
        if '-z' not in args:
            packet.add(label, output or 'No changed paths.')
            continue
        items, note = (entries(output), '') if 'ls-files' not in args else ([('', [p]) for p in output.split('\x00') if p], '')
        if base is not None:
            # Without an index refresh a touched but unchanged file reads as M; keep only real content changes.
            real = content_changed(h, root, [*diff, '--numstat', '-z', '-M', *base, '--', *pathspec])
            kept = [(status, paths) for status, paths in items if status != 'M' or paths[0] in real]
            if len(kept) < len(items):
                note = f'\nNot listed: {len(items) - len(kept)} path(s) whose timestamp changed but content did not.'
            items = kept
        # Paths are data; escape controls to prevent forged packet headings.
        display = '\n'.join(repr(part) for status, paths in items for part in ([status] if status else []) + paths)
        packet.add(label, (display or 'No changed paths.') + note)
    excluded = filter_lines + ['submodule ' + h['printable'](path) + ': contents never compared, including any uncommitted changes inside it'
                               for path in submodules]
    if excluded:
        packet.add('Excluded from the comparison (informational)', '\n'.join(excluded))
    packet.add('Snapshot coverage', 'Ignored implementation/configuration inputs and binary content require the preserved manifest/patch evidence. A clean-looking diff alone cannot prove receipt binding. Never read excluded archive-dnr paths or traverse links.')


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:  # Windows pipes default to a code page that cannot hold record text
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--task', required=True)
    parser.add_argument('--snapshot')
    parser.add_argument('--report', help='repository-relative current implementation report, when discovery is ambiguous')
    parser.add_argument('--class-keyword', action='append', default=[])
    parser.add_argument('--root', default='.')
    parser.add_argument('--omissions-offset', type=int, default=0, help='character offset in omitted identities JSON')
    args = parser.parse_args(argv)
    if args.omissions_offset < 0:
        parser.error('omissions offset must be nonnegative')
    try:
        h = shared()
        root = h['safe_path'](args.root, 'dir')
        config = h['read'](root/'docs/workflow/README.md', root)
        effective = h['parse_config'](config, root)
        h['workflow_routes'](root, effective, 'review')
        try:
            path = h['task_spec'](root, args.task)
        except FileNotFoundError:
            print(f'No task records yet for {args.task}. Nothing to report; no review conclusion follows.')
            return 0
        spec = h['read'](path, root)
        rel = path.relative_to(root).as_posix()
        source_meta, _, _ = h['record_api']()['metadata'](path)
        phase = source_meta.get('record') == 'direction'
        report, meta, notices = report_for(h, root, path, spec, args.report)
        packet = h['Packet'](omissions_offset=args.omissions_offset)
        packet.add('Review packet limits', 'Read requirements and actual code before author justifications. This packet includes only selected spec sections, receipt tables and ledger rows; it establishes no acceptance, complete coverage or historical snapshot identity. Omitted/missing evidence remains incomplete.')
        if phase:
            packet.add('Phase direction and owner', rel + ' :: read complete applicable direction and actual phase procedure. Existing phase-status authority: ' + str(effective['context_and_state_owners']['existing_phase_status_authority']) + '; read it directly.')
        else:
            for heading in ('Status', 'Scope'):
                section = h['exact_h2_or_none'](spec, heading)
                if section is None:
                    packet.omit(rel + ' :: ' + heading + ' (no exact ## ' + heading + ' section; inspect and reconcile before a review conclusion)')
                else:
                    packet.add(rel + ' :: ' + heading, section)
            exceptions = h['get_section'](spec, 'Approved exceptions currently in force')
            if exceptions:
                packet.add(rel + ' :: Approved exceptions currently in force', exceptions)
            else:
                packet.omit(rel + ' :: Approved exceptions currently in force (section missing; inspect and reconcile before a review conclusion)')
            h['add_rows'](packet, 'Acceptance table', h['rows'](h['get_section'](spec, 'Product and acceptance criteria')))
        h['add_rows'](packet, 'Report discovery notices (not an acceptance decision)', notices)
        if any(notice.startswith('INCOMPLETE:') for notice in notices):
            packet.omit('report routing and repair evidence named in the discovery notices (read those sections directly)')
        changes(h, packet, root, args.snapshot, meta)
        if report:
            receipt = h['exact_h2_or_none'](h['read'](report, root), 'Execution Receipt')
            packet.add('Receipt provenance', str(report.relative_to(root)) + '; original spec/direction revision: ' + meta.get('spec_revision', 'unknown') + '; original snapshot: ' + meta.get('snapshot', 'unknown') + '. These receipts do not establish the final repair snapshot or reconstruct a historical tree.')
            if receipt is None:
                packet.omit(report.relative_to(root).as_posix() + ' :: Execution Receipt (no exact ## Execution Receipt section)')
            else:
                h['add_rows'](packet, 'Execution Receipt table only', h['rows'](receipt))
        else:
            packet.add('Execution Receipt', 'No unambiguous current report selected. Missing evidence is incomplete, never a pass.')
        opened, matched, classes, ledger_notices = h['ledger'](root, keywords=args.class_keyword)
        h['add_rows'](packet, 'Ledger Open (all tasks)', opened)
        h['add_rows'](packet, 'Closed and archive class matches', matched)
        for notice in ledger_notices:
            packet.omit(notice)
        packet.add('Recurrence coverage', 'Searched classes: ' + ', '.join(sorted(classes)) if classes else 'No class keys available. Supply --class-keyword for relevant classes; absence of matches is not proof of no recurrence.')
        if report:
            audit_dir = report.parent
            api = h['record_api']()
            warnings = []
            audits = []
            for candidate in api['walk_records'](audit_dir, warnings):
                data, lifecycle, template = api['metadata'](candidate)
                if not template and lifecycle == 'active' and data.get('record') == 'self-audit' and data.get('spec_revision') == meta.get('spec_revision') and (not data.get('task') or data.get('task') == meta.get('task')):
                    audits.append(candidate.relative_to(root).as_posix() + ' :: snapshot ' + data.get('snapshot', 'unbound'))
            packet.add('Deferred self-audit reading', '\n'.join(audits[:30]) + (f'\nINCOMPLETE: {len(audits)-30} audit identities omitted.' if len(audits)>30 else '') if audits else 'No matching active self-audit pointer found. Read any supplied audit only after neutral initial inspection; absence is incomplete where required.')
            if len(audits) > 30:
                packet.omit(f'Deferred self-audit reading ({len(audits) - 30} audit identities)')
        return packet.finish()
    except FileNotFoundError as error:
        print('Refused: missing required input: ' + str(error)[:1000] + '; evidence remains incomplete.', file=sys.stderr)
        return 2
    except (OSError, UnicodeError, ValueError, subprocess.TimeoutExpired) as error:
        print('Refused: ' + str(error)[:2000], file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
