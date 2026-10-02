#!/usr/bin/env python3
"""Read-only v5 activity startup packet. Routing never grants authority.

Exit 0: packet complete, or the output states the task has no record yet.
Exit 2: refused or could not run. Exit 3: packet printed with omitted sections named.
Exit 1 is not used.
Long omitted identities are paged with --omissions-offset; concatenate the JSON fragments.
"""
import argparse
from pathlib import Path
import re
import runpy
import stat
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


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:  # Windows pipes default to a code page that cannot hold record text
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--task', required=True)
    parser.add_argument('--root', default='.')
    parser.add_argument('--activity', choices=['plan', 'implement', 'verify', 'self-audit', 'review', 'repair', 'complete', 'resume'], default='resume')
    parser.add_argument('--role', help='removed in v5')
    parser.add_argument('--omissions-offset', type=int, default=0, help='character offset in omitted identities JSON')
    args = parser.parse_args(argv)
    if args.omissions_offset < 0:
        parser.error('omissions offset must be nonnegative')
    if args.role is not None:
        print('Refused: --role was removed in v5. Use --activity for reading routes; consult the assignment for authority.', file=sys.stderr)
        return 2
    try:
        h = shared()
        root, config = h['setup'](args.root)
        effective = h['parse_config'](config, root)
        route = h['workflow_routes'](root, effective, args.activity)
        contract = h['read'](root/'docs/workflow/contract.md', root)
        core = h['get_section'](contract, 'Part A')
        if not core:
            raise ValueError('mandatory contract Part A missing; inspect contract directly')
        try:
            spec_path = h['task_spec'](root, args.task)
        except FileNotFoundError:
            spec_path = None  # only an absent task record means "no record yet"; other missing files refuse
        phase, status, pointers, pointer_notices = False, None, None, []
        if spec_path is not None:
            spec = h['read'](spec_path, root)
            _, phase, status, pointers, pointer_notices = h['status_routing'](root, spec_path, spec)
            if not phase:  # everything that can refuse is read before any output
                table = h['rows'](h['get_section'](spec, 'Product and acceptance criteria'))
                opened, _, _, ledger_notices = h['ledger'](root, spec_path.parent.name)
        packet = h['Packet'](omissions_offset=args.omissions_offset)
        cfg = effective['process_configuration']
        packet.add('Startup guard', 'Orientation and activity routing only. Read complete applicable instructions before actions. The assignment grants authority; helper success does not prove acceptance.')
        packet.add('Configuration — docs/workflow/README.md', 'Bundle version: ' + h['VERSION'] +
                   '\nProcess: ' + cfg['process'] + '\nAudit: ' + cfg['self_audit'] +
                   '\nSelected references: ' + ', '.join(r['path'] for r in effective['selected_references']) +
                   '\nRead README configuration and state-owner sections directly; paths here do not grant authority.')
        packet.add('Mandatory core — docs/workflow/contract.md :: Part A', core)
        packet.add('Required process sections', '\n'.join(cfg['process'] + ' :: ' + title for title in route))
        reads = ['docs/workflow/README.md :: Process configuration, selected references, context/state owners, grants, storage and dependencies',
                 cfg['process'] + ' :: ' + cfg['headings']['orient'] + '; ' + cfg['headings'][args.activity] + '; ' + cfg['headings']['communicate'] + ' (exact complete sections)',
                 'CLAUDE.md :: standing protections and task-relevant shared facts',
                 'docs/workflow/contract.md :: applicable Part B procedures before their actions',
                 'docs/workflow/record-frontmatter.md :: before record metadata or inventory binding']
        if args.activity == 'self-audit':
            reads.extend([cfg['self_audit'] + ' :: Audit method', cfg['self_audit_template']])
        for ref in effective['selected_references']:
            reads.append(ref['path'] + ' :: ' + ref['applies_to'] + '; read applicable sections and relative dependencies')
        packet.add('Required remaining reads, in order', '\n'.join(reads))
        if spec_path is None:
            packet.add('Assigned task', 'No task record yet. Read direct assignment or established phase-state owner; do not invent Status or acceptance IDs.')
            return packet.finish()
        rel = spec_path.relative_to(root).as_posix()
        if phase:
            packet.add('Phase direction and owner', rel + ' :: read complete applicable direction and actual phase procedure. Existing phase-state authority: ' + str(effective['context_and_state_owners']['existing_phase_status_authority']) + '. Read that owner directly; currentness and repair routing must be checked there and in explicit reports. Required phase machine audit remains a separate gate.')
            return packet.finish()
        if status is None:
            packet.omit(rel + ' :: Status (no exact ## Status section; reconcile from actual records)')
        else:
            packet.add(rel + ' :: Status (verbatim)', status)
        if pointers is None:
            packet.add('Report routing limitation', 'INCOMPLETE: current repair-evidence routing is unverified; inspect Status and latest handoff directly.')
            packet.omit('report routing (no explicit Status report pointers; inspect Status and the latest handoff)')
        if pointer_notices:
            packet.add('Repair evidence routing', '\n'.join(pointer_notices))
            packet.omit('repair evidence (read the named Repair and final verification section directly)')
        slice_line = next((line for line in (status or '').splitlines() if 'Current slice and acceptance IDs:' in line), '')
        # "AC-2." ends a sentence; a range such as AC-1..AC-3 is kept whole and reported if no row carries it.
        ids = {token.rstrip('.-') for token in re.findall(r'\bAC-[\w.-]+', slice_line)}
        selected = table[:2] + [row for row in table[2:] if not ids or h['cells'](row)[0] in ids]
        h['add_rows'](packet, 'Current slice acceptance map' + ('' if ids else ' — slice IDs unavailable; full map candidates'), selected)
        unmatched = sorted(ids - {h['cells'](row)[0] for row in table[2:]})
        if unmatched:
            packet.omit('acceptance rows for slice IDs matching no row: ' + ', '.join(unmatched) + '; read the full acceptance table')
        h['add_rows'](packet, 'docs/project/findings-ledger.md :: Open rows matching task', opened)
        for notice in ledger_notices:
            packet.omit(notice)
        packet.add('Next action and record paths', '\n'.join(line for line in (status or '').splitlines() if any(k in line for k in ('Next action', 'Records to open', 'Evidence root'))))
        packet.add('Required next reads', rel + ' :: Product and acceptance criteria; Scope; Current baseline and assumptions; Approved exceptions currently in force; applicable Design and delegated choices and Behavioral slices. Run record-index.py on the task directory; inspect relevant unclassified/historical evidence.')
        return packet.finish()
    except FileNotFoundError as error:
        print('STOP: missing required workflow or selected file: ' + str(error)[:1000], file=sys.stderr)
        return 2
    except (OSError, UnicodeError, ValueError) as error:
        print('Refused: ' + str(error)[:2000], file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
