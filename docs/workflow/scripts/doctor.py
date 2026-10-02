#!/usr/bin/env python3
"""Read-only v5 workflow diagnostics. Exit 0 is never a clean bill of health.

Exit 0: no installation errors; warnings may remain. Exit 1: installation errors, printed
as ERROR lines. Exit 2: usage error. Exit 3 is not used. Task-record problems are WARN lines.
"""
import argparse
import errno
import os
from pathlib import Path
import re
import runpy
import stat
import subprocess
import sys


REQUIRED_FIXED = {
    'AGENTS.md', '.claude/rules/workflow.md', 'docs/workflow/contract.md',
    'docs/workflow/record-frontmatter.md',
    'docs/workflow/scripts/section.py', 'docs/workflow/scripts/brief.py',
    'docs/workflow/scripts/record-index.py', 'docs/workflow/scripts/review-packet.py',
    'docs/workflow/scripts/doctor.py', 'docs/workflow/scripts/bar-guard.py',
    'docs/project/tasks/_SPEC-TEMPLATE.md', 'docs/project/tasks/_SPEC-LOG-TEMPLATE.md',
    'docs/project/tasks/_REPORT-TEMPLATE.md', 'docs/project/tasks/_REVIEW-TEMPLATE.md',
    'docs/project/_LEDGER-TEMPLATE.md', 'docs/adr/_TEMPLATE.md',
    'docs/external/README.md',
}
HELPERS = ('section.py', 'brief.py', 'record-index.py', 'review-packet.py', 'doctor.py', 'bar-guard.py')
SELF_CHECK_TIMEOUT = 15


def shared():
    path = Path(__file__).absolute().with_name('section.py')
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        info = current.lstat()
        if part.casefold() == 'archive-dnr' or stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('excluded helper path or ancestor')
    return runpy.run_path(str(path))


STARTUP_PAIR = ('AGENTS.md', '.claude/rules/workflow.md')
SPEC_SCAN_LIMIT = 200


def body_after_h1(text):
    lines = text.split('\n')
    for index, line in enumerate(lines):
        if line.strip():
            if re.match(r'^ {0,3}#[ \t]', line):
                return '\n'.join(lines[index + 1:]).strip()
            break
    return text.strip()


def startup_parity(h, root, add):
    """Both hosts must route the same assignments and lanes; only the H1 may differ."""
    try:
        bodies = [body_after_h1(h['read'](root/name, root)) for name in STARTUP_PAIR]
    except (OSError, UnicodeError, ValueError):
        return  # missing or refused entrypoints are reported with the required files
    if bodies[0] == bodies[1]:
        add('INFO', 'AGENTS.md and .claude/rules/workflow.md match beyond their H1.')
        return
    first, second = bodies[0].split('\n'), bodies[1].split('\n')
    line = next((n for n, pair in enumerate(zip(first, second), 1) if pair[0] != pair[1]), min(len(first), len(second)) + 1)
    add('WARN', f'AGENTS.md and .claude/rules/workflow.md differ beyond their H1 (first difference at body line {line}); '
                'both hosts must route the same assignments and lanes. Inspect directly; document any intentional local integration.')


def self_check(h, root, add):
    """Each installed helper must start: its --help runs with -B and a short timeout."""
    env = os.environ.copy()
    env.update({'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONIOENCODING': 'utf-8'})
    failed = 0
    for name in HELPERS:
        rel = 'docs/workflow/scripts/' + name
        try:
            path = h['safe_path'](root/rel, 'file', root)
        except (OSError, ValueError):
            continue  # a missing or refused helper is already an ERROR from the required-file check
        try:
            result = subprocess.run([sys.executable, '-B', str(path), '--help'], cwd=str(root), capture_output=True,
                                    timeout=SELF_CHECK_TIMEOUT, env=env)
        except subprocess.TimeoutExpired:
            add('ERROR', f'Helper self-check: {rel} did not finish --help within {SELF_CHECK_TIMEOUT} seconds.')
            failed += 1
            continue
        except OSError as error:
            add('ERROR', f'Helper self-check: {rel} could not start: ' + str(error)[:200])
            failed += 1
            continue
        if result.returncode or 'usage:' not in result.stdout.decode('utf-8', 'replace'):
            tail = [line for line in result.stderr.decode('utf-8', 'replace').splitlines() if line.strip()][-1:]
            add('ERROR', f'Helper self-check: {rel} fails to start (--help exit {result.returncode}): ' + (tail[0][:200] if tail else 'no usage text'))
            failed += 1
    if not failed:
        add('INFO', 'Helper self-check: every installed helper present starts and prints its usage.')


def pointer_kind(label, value, h, root):
    """Classify a Status pointer value; only the startup grammar makes it 'invalid'.

    Returns (kind, reason). 'invalid': the exact grammar refuses the value. 'uncertain': the
    path grammar allows a value with spaces, but no file exists by that name (missing, or a
    name this system cannot hold), so a missing file and prose look alike. 'unresolved': the
    path reaches something other than a safe regular file, such as a directory or a link, or
    cannot be checked. Resolution never decides grammar.
    """
    snapshot = label == 'Final repair snapshot'
    if value == ('not applicable' if snapshot else 'none'):
        return 'exact', ''
    if snapshot and (not value or value.strip() != value or len(value) > 300 or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        return 'invalid', ''
    spaced = any(c.isspace() for c in value)
    if snapshot and not spaced:
        return 'exact', ''  # a commit id or path; the startup helper treats it as an unverified claim
    try:
        h['_relative_file'](value)  # a spaced snapshot can only be a path, since commit ids have no spaces
    except ValueError:
        return 'invalid', ''
    if spaced:
        try:
            h['safe_path'](root/value, 'file', root)
        except OSError as error:
            # Windows reports a name it cannot hold (such as one with ? or ") as EINVAL.
            if isinstance(error, (FileNotFoundError, NotADirectoryError)) or error.errno in (errno.EINVAL, errno.ENAMETOOLONG):
                return 'uncertain', ''
            return 'unresolved', str(error)[:160]
        except ValueError as error:
            return 'unresolved', str(error)[:160]
    return 'exact', ''


def pointer_hints(h, root, rel, status, add):
    """Explain pointer values: prose, a possibly missing file, or a path that does not resolve.

    Runs even when the startup grammar refuses the Status, so a refused Status still shows its
    other broken pointers. Values keep their outer spaces, as the startup grammar reads them.
    """
    visible = h['_visible_prose'](status)
    invalid, uncertain = [], []
    for label in h['STATUS_LABELS']:
        for value in re.findall(r'(?m)^\s*-\s*' + re.escape(label) + r':[ \t]?(.*)$', visible):
            kind, reason = pointer_kind(label, value, h, root)
            if kind == 'invalid':
                invalid.append(label)
            elif kind == 'uncertain':
                uncertain.append(label)
            elif kind == 'unresolved' and label == 'Final repair snapshot':
                add('WARN', rel + ': Status final repair snapshot does not resolve: ' + reason)
            if label != 'Final repair snapshot' and kind != 'invalid' and value != 'none':
                key = 'implementation' if label == 'Current implementation report' else 'repair'
                try:
                    h['safe_path'](root/value, 'file', root)
                except FileNotFoundError:
                    add('WARN', rel + f': Status {key} report pointer does not resolve: missing file {value}')
                except (OSError, ValueError) as error:
                    add('WARN', rel + f': Status {key} report pointer does not resolve: ' + str(error)[:160])
    if invalid:
        add('WARN', rel + ': Status pointer holds prose or a non-exact value: ' + ', '.join(sorted(set(invalid))) +
            '. Report fields take a repository-relative path or none; Final repair snapshot takes one snapshot identity '
            'or not applicable. Move prose to Next action and owner.')
    if uncertain:
        add('WARN', rel + ': Status pointer holds prose or names a missing file: ' + ', '.join(sorted(set(uncertain))) +
            '. Spaces are allowed in paths and no such file exists, so doctor cannot tell which. '
            'If it is a path, create or correct the file; if it is prose, move it to Next action and owner.')


def status_pointers(h, root, add):
    """Run the startup helper's own task-record routine on each spec; every refusal is a WARN naming its reason."""
    tasks = root/'docs/project/tasks'
    try:
        h['safe_path'](tasks, 'dir', root)
    except FileNotFoundError:
        return
    except (OSError, ValueError) as error:
        add('UNVERIFIED', 'Task specs not scanned: ' + str(error)[:200])
        return
    warnings, skipped = [], []
    walk = h['record_api']()['walk_records']
    try:
        records = walk(tasks, warnings, skipped)
    except TypeError:
        add('ERROR', 'docs/workflow/scripts/record-index.py predates these helpers (no skipped-link list); '
                     'refresh README and all six helpers together. Linked task folders were not named.')
        records = walk(tasks, warnings)
    specs = [p for p in records if p.name == 'spec.md']
    legacy = 0
    for path in specs[:SPEC_SCAN_LIMIT]:
        rel = path.relative_to(root).as_posix()
        try:
            text = h['read'](path, root)
        except (OSError, UnicodeError, ValueError) as error:
            add('WARN', rel + ': task record not inspected: ' + str(error)[:200])
            continue
        try:
            status = h['exact_h2_or_none'](text, 'Status')
        except ValueError:
            status = ''  # a duplicate Status section; the startup routine below names the refusal
        if status:
            pointer_hints(h, root, rel, status, add)
        try:
            _, phase, status, pointers, _ = h['status_routing'](root, path, text)
        except (OSError, UnicodeError, ValueError) as error:
            add('WARN', rel + ': startup helper would refuse this task record: ' + str(error)[:300])
            continue
        if not phase and status is None:
            add('WARN', rel + ': no exact ## Status section; startup packets report it missing.')
        elif not phase and pointers is None:
            legacy += 1
    if len(specs) > SPEC_SCAN_LIMIT:
        add('UNVERIFIED', f'{len(specs) - SPEC_SCAN_LIMIT} task specs beyond the scan bound were not checked for Status pointers.')
    if legacy:
        add('UNVERIFIED', f'{legacy} task spec(s) have no explicit Status report pointers; startup repair routing stays unverified for them.')
    for link in skipped[:10]:
        add('WARN', 'Linked task folder or record skipped, never followed: ' + link.relative_to(root).as_posix())
    if warnings:
        add('WARN', 'Task spec traversal warnings: ' + '; '.join(w[:120] for w in warnings[:5]))


def ledger_counts(h, root, add):
    # The archive is a startup input even when the main ledger has not been created.
    try:
        h['optional'](root/'docs/project/findings-ledger-archive.md', root)
    except (OSError, UnicodeError, ValueError) as error:
        add('WARN', 'docs/project/findings-ledger-archive.md not inspected (startup and review packets refuse it too): ' + str(error)[:200])
    try:
        text = h['optional'](root/'docs/project/findings-ledger.md', root)
    except (OSError, UnicodeError, ValueError) as error:
        add('WARN', 'docs/project/findings-ledger.md not inspected (startup and review packets refuse it too): ' + str(error)[:200])
        return
    if not text:
        add('INFO', 'No findings ledger yet.')
        return
    counts = {}
    for title in ('Open', 'Closed'):
        try:
            section = h['exact_h2_or_none'](text, title)
        except ValueError as error:
            add('WARN', 'docs/project/findings-ledger.md: ' + str(error)[:200])
            section = ''
        if section is None:
            add('WARN', f'docs/project/findings-ledger.md has no exact ## {title} section; startup and review packets report it missing.')
        counts[title] = len(h['data_rows'](section or ''))
    add('WARN' if counts['Closed'] > 60 else 'INFO', f'Ledger Open: {counts["Open"]}; Closed: {counts["Closed"]}; archive older Closed rows when Closed exceeds 60.')


def changed(a, b, prefix=''):
    if isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(set(a) | set(b)):
            yield from changed(a.get(key, '<missing>'), b.get(key, '<missing>'), prefix + '.' + key if prefix else key)
    elif isinstance(a, list) and isinstance(b, list):
        for index in range(max(len(a), len(b))):
            yield from changed(a[index] if index < len(a) else '<missing>',
                               b[index] if index < len(b) else '<missing>', f'{prefix}[{index}]')
    elif a != b:
        yield prefix, a, b


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:  # Windows pipes default to a code page that cannot hold record text
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--root', default='.')
    args = parser.parse_args(argv)  # an unknown argument is a usage error: exit 2
    findings = []
    def add(level, message):
        findings.append((level, re.sub(r'\s*[\r\n]+\s*', '; ', message)))  # one finding per line
    try:
        h = shared()
        root, config = h['setup'](args.root)
        match = re.search(r'(?m)^-? ?Bundle version:\s*([^\n]+)', config)
        installed = match[1].strip() if match else 'unavailable'
        add('INFO' if installed == h['VERSION'] else 'WARN', f'Installed version {installed}; helper bundle version {h["VERSION"]}.')
        try:
            effective = h['parse_config'](config, root)
            add('INFO', 'Effective v5 configuration parses strictly.')
        except (OSError, UnicodeError, ValueError) as error:
            effective = None
            message = str(error)
            if message.startswith('refresh required'):
                add('ERROR', 'Refresh required' + message[len('refresh required'):500])
                add('UNVERIFIED', 'Routing, process headings and inventory configuration were not checked; refresh README and helpers together first.')
            else:
                add('ERROR', 'Effective configuration refused: ' + message[:500])
                add('UNVERIFIED', 'Legacy/malformed process configuration requires direct migration inspection; no role-map fallback.')
        targets = sorted(REQUIRED_FIXED | {'docs/workflow/README.md', 'CLAUDE.md'})
        if effective:
            cfg = effective['process_configuration']
            targets += [cfg['process'], cfg['self_audit'], cfg['self_audit_template']]
            targets += [r['path'] for r in effective['selected_references']]
            try:
                process = h['read'](root/cfg['process'], root)
                for key, title in cfg['headings'].items():
                    h['exact_h2_section'](process, title)
                h['exact_h2_section'](h['read'](root/cfg['self_audit'], root), 'Audit method')
                add('INFO', 'Common process and audit headings resolve exactly.')
            except (OSError, UnicodeError, ValueError) as error:
                add('ERROR', 'Process/audit route: ' + str(error)[:500])
            refs = [r['path'] for r in effective['selected_references']]
            if any(p.endswith('lucentdev-web.md') for p in refs) and not any(p.endswith('/web.md') for p in refs):
                add('ERROR', 'LucentDev selection is missing web.md dependency.')
            for key in ('local_task_branch_commits', 'execution_profiles', 'enforced_boundaries', 'checkout_worktree_support'):
                if effective[key] is None:
                    add('UNVERIFIED', 'Optional legacy configuration fact absent: ' + key)
            for key, val in effective['context_and_state_owners'].items():
                if val is None:
                    add('UNVERIFIED', 'Context/state owner fact absent: ' + key)
        for target in dict.fromkeys(targets):
            try:
                body = h['read'](root/target, root)
                add('INFO', 'Resolved ' + target)
                if target in ('AGENTS.md', '.claude/rules/workflow.md'):
                    if 'docs/workflow/README.md' not in body:
                        add('WARN', target + ' does not route to workflow README.')
                    if re.search(r'(?i)(?:roles/project-lead|roles/worker|startup defaults and role map)', body):
                        add('ERROR', target + ' retains stale active role routing.')
                    for linked in re.findall(r'`((?:docs/workflow/)[^`\n]+\.md)`', body):
                        h['safe_path'](root/linked, 'file', root)
                if target == 'docs/workflow/contract.md' and not h['get_section'](body, 'Part A'):
                    add('ERROR', 'docs/workflow/contract.md has no Part A section; brief.py refuses every startup packet.')
            except (OSError, UnicodeError, ValueError) as error:
                add('ERROR', target + ': missing/refused — ' + str(error)[:300])
        startup_parity(h, root, add)
        self_check(h, root, add)
        context = h['optional'](root/'CLAUDE.md', root)
        count = len(context.split())
        add('WARN' if count > 3000 else 'INFO', f'CLAUDE.md: {count} words; budget about 3000, standing protections preserved.')
        clean = re.sub(r'<!--.*?-->', '', config, flags=re.S)
        if re.search(r'(?im)^\s*(?:#+\s+(?:Status|Session Memory|Task progress)|-\s*(?:Current slice|Completed slices|Implementation|Verification|Review|Next action|Task ID|Acceptance notes):)', clean):
            add('WARN', 'README contains task-progress markers; inspect state ownership.')
        if re.search(r'(?i)Startup defaults and role map', clean):
            add('ERROR', 'README retains stale role-map routing.')
        ledger_counts(h, root, add)
        status_pointers(h, root, add)
        dependencies = h['get_section'](config, 'External workflow dependencies')
        concrete = [p for p in re.findall(r'`([^`\n]+)`', dependencies) if ('/' in p or '\\' in p) and not any(c in p for c in '[]<>|') and not p.startswith(('python ', 'http'))]
        for name in concrete:
            try:
                h['safe_path'](root/name, within=None if Path(name).is_absolute() else root)
                add('INFO', 'Dependency path present: ' + name)
            except (OSError, ValueError) as error:
                add('WARN', 'Dependency missing/refused: ' + name + ' — ' + str(error)[:200])
        if not concrete:
            add('INFO', 'No concrete external-dependency paths recorded; capability availability remains unverified when needed.')
        try:
            code, output, error = h['git'](root, 'check-ignore', '--no-index', 'AGENTS.md', 'CLAUDE.md', '.claude/rules/workflow.md', 'docs/workflow/README.md')
            if code in (0, 1):
                add('WARN' if output.strip() else 'INFO', 'Effective Git ignore state: ' + (output.strip().replace('\n', ', ') or 'startup/context/README paths eligible'))
            else:
                add('UNVERIFIED', 'Git ignore state unavailable: ' + error.strip()[:200])
        except h['GitUnavailable']:
            add('UNVERIFIED', 'git executable not found; ignore state cannot be verified.')
        except FileNotFoundError:
            add('UNVERIFIED', 'No Git repository at the root; ignore state cannot be verified.')
        except (OSError, subprocess.TimeoutExpired) as error:
            add('UNVERIFIED', 'Git ignore state unavailable: ' + str(error)[:200])
        inventory = re.findall(r'(?m)^(?:- )?Current preserved inventory revision:\s*`?([^`\n]+)', h['_visible_prose'](config))
        if len(inventory) != 1 or '[' in inventory[0]:
            add('UNVERIFIED', 'No unique concrete preserved inventory revision.')
        else:
            name = inventory[0].strip()
            if re.search(r'\s+(?:at|@)\s+', name):
                add('UNVERIFIED', 'Commit-bound inventory needs direct historical comparison: ' + name)
            else:
                h['_relative_file'](name)
                inv = h['read'](root/name, root)
                new_format = any(e['title'] in ('Instruction identities', 'Effective configuration') for e in h['headings'](inv))
                entries, table_valid = [], False
                if new_format:
                    try:
                        identities = h['exact_h2_section'](inv, 'Instruction identities')
                        lines = identities.splitlines()
                        start = next(i for i, line in enumerate(lines) if line.lstrip().startswith('|'))
                        table = []
                        for line in lines[start:]:
                            if not line.lstrip().startswith('|'):
                                break
                            table.append(line)
                        if len(table) < 3 or h['cells'](table[0]) != ['Path', 'Source version', 'State and reason', 'SHA-256 (LF)'] or len(h['cells'](table[1])) != 4 or not all(re.fullmatch(r':?-{3,}:?', x) for x in h['cells'](table[1])):
                            raise ValueError('Instruction identities table header/separator malformed')
                        entries = table[2:]
                        table_valid = True
                    except (StopIteration, ValueError) as error:
                        add('UNVERIFIED', 'Instruction identities malformed: ' + str(error)[:300] + '; no unrelated tables compared.')
                    try:
                        snapshot = h['canonical_effective_inventory'](h['_one_json'](h['exact_h2_section'](inv, 'Effective configuration')))
                        if effective is None:
                            add('UNVERIFIED', 'Current effective configuration unavailable; inventory configuration cannot be compared.')
                        else:
                            differences = list(changed(snapshot, effective))
                            for field, old, new in differences:
                                add('ERROR', 'Effective configuration changed: ' + field + '; inspect inventory and README directly.')
                            if not differences:
                                add('INFO', 'Effective configuration matches inventory.')
                    except ValueError as error:
                        add('UNVERIFIED', 'Effective configuration inventory object malformed: ' + str(error)[:300])
                else:
                    add('UNVERIFIED', 'Legacy inventory configuration unverified; best-effort historical hash comparison only.')
                    entries = h['data_rows'](inv)
                verified = 0
                seen_targets = set()
                for row in entries:
                    parts = h['cells'](row)
                    if new_format and (len(parts) != 4 or not re.fullmatch(r'[a-fA-F0-9]{64}', parts[3])):
                        add('UNVERIFIED', 'Malformed scoped identity row: ' + row[:160])
                        continue
                    digest = next((re.search(r'\b[a-fA-F0-9]{64}\b', p) for p in parts if re.search(r'\b[a-fA-F0-9]{64}\b', p)), None)
                    if not digest:
                        add('WARN', 'Unrecognized identity row; unverified: ' + row[:160])
                        continue
                    target = parts[0]
                    if new_format:
                        try:
                            h['_relative_file'](target)
                        except ValueError as error:
                            add('UNVERIFIED', 'Unsafe scoped identity path: ' + str(error)[:160])
                            continue
                        if target in seen_targets:
                            add('ERROR', 'Duplicate scoped identity path: ' + target)
                            continue
                        seen_targets.add(target)
                    if target in ('CLAUDE.md', 'docs/workflow/README.md') or target == name:
                        add('INFO', 'Mutable context/config/inventory excluded from instruction hashes: ' + target)
                        continue
                    try:
                        actual = h['lf_hash'](h['read'](root/target, root, keep_bom=True))
                        add('INFO' if actual == digest[0].lower() else 'ERROR', ('Inventory identity matches: ' if actual == digest[0].lower() else 'Inventory identity mismatch (LF): ') + target)
                        verified += 1
                    except (OSError, UnicodeError, ValueError) as error:
                        add('ERROR', 'Inventory path missing/refused: ' + target + ' — ' + str(error)[:200])
                if new_format and table_valid:
                    if effective is None:
                        add('UNVERIFIED', 'Expected dynamic instruction identities unavailable because effective configuration was refused.')
                    else:
                        cfg = effective['process_configuration']
                        expected = REQUIRED_FIXED | {cfg['process'], cfg['self_audit'], cfg['self_audit_template']}
                        expected.update(r['path'] for r in effective['selected_references'])
                        missing = sorted(expected - seen_targets)
                        for target in missing:
                            add('ERROR', 'Required instruction identity missing from inventory: ' + target)
                        if not missing:
                            add('INFO', 'All required installed instruction paths have scoped identity rows.')
                if not verified:
                    add('UNVERIFIED', 'No comparable instruction identities.')
    except FileNotFoundError as error:
        add('ERROR', 'Required workflow or inventory file missing: ' + str(error)[:1000])
        add('UNVERIFIED', 'Installed workflow/inventory identity is incomplete; startup must stop if required files are absent.')
    except (OSError, UnicodeError, ValueError) as error:
        add('ERROR', 'Refused: ' + str(error)[:2000])
    except Exception as error:  # a mismatched helper must not hide the findings already collected
        add('ERROR', f'Doctor stopped at an unexpected {type(error).__name__}: {str(error)[:300]}; later checks did not run. '
                     'A partial refresh with mismatched helpers can cause this.')
    order = {'ERROR': 0, 'WARN': 1, 'UNVERIFIED': 2, 'INFO': 3}
    ordered = sorted(findings, key=lambda item: order[item[0]])
    print('Workflow doctor (read-only). Exit 0 means no installation errors; warnings may remain, and no exit code is a clean bill of health.')
    size = 0
    for n, (severity, message) in enumerate(ordered):
        line = severity + ': ' + message
        if size + len(line) > 23000 or n >= 100:
            print(f'INCOMPLETE: {len(ordered)-n} findings omitted; inspect named configuration/inventory sections directly.')
            break
        print(line)
        size += len(line) + 1
    if not findings:
        print('Nothing to report.')
    return 1 if any(severity == 'ERROR' for severity, _ in findings) else 0


if __name__ == '__main__':
    sys.exit(main())
