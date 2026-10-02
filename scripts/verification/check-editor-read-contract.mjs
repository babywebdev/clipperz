// The editor read contract, proved against intended behaviour (1B.2b.2, lead-19).
//
// A verification-only conformance runner. It states what
// GET /api/clips/:id/editor-context *must* answer, derives every expectation
// from a source outside the validator under test, and reports each case as it
// actually lands. It is deliberately not a regression suite for the current
// implementation: a case that fails here is a failed application conformance
// result, and the process exits non-zero.
//
// Where the expectations come from:
//
//   * backend/services/exact_render.py, run out of process through
//     fixtures/editor-read-contract/producer-oracle.py, settles the editorial
//     transcript projection and text, the bookend interval and transition
//     equations and the tolerance arithmetic.
//   * The documents the accepted save service writes in this run settle every
//     projected identity, recipe, segment, card, artifact, domain and probe.
//   * Four genuine accepted pre-composition documents, recorded by the lead-18
//     reassessment, supply the historical raw-media profile. They are copied
//     into the fixture byte for byte; the originals are only read and hashed.
//   * The real by-id preview and download routes, over real HTTP, settle which
//     files can actually be served, so a committed-media capability can be
//     compared with what the route does rather than with what the reader thinks.
//
//   * src/models/clip-editor-context.ts, the published response type contract,
//     settles the capability and diagnostic code vocabularies. It is a shared
//     type declaration, not the validator under test.
//
// Nothing here imports clip-editor-read-contract.js or clip-editor-context.js
// to decide an expected value, and no predicate of theirs is copied.
//
// Coverage accounting (lead-20 CP-1 / WS-18). Every credited response leaf
// carries the check that was actually executed there and where its expected
// value came from. A container marker credits its own path and nothing below
// it, so an unasserted or newly added child surfaces as a gap; only a complete
// object or array comparison, whose structure was compared as well, reaches its
// descendants. Shape checks are reported as shape, never as semantic equality.
// Declared required coverage is fatal: a gap makes the run incomplete and the
// exit nonzero even when every product case passes. `--self-check-only` runs
// the verifier self-checks over that machinery and stops before the fixture.
//
// Expected-value sources (lead-21 CPR-1 / WS-19). A saved-record projection and
// a live filesystem observation are different facts and are never compared with
// each other here. A field the save *recorded* is checked against the document
// that recorded it; a field the response derives from the file *now* is checked
// against the file. `media.output` is the live contract, carrying stat-derived
// `bytes` beside `recorded_bytes` and `size_matches`; `revision.document`,
// including its optional-artifact subtree, is the recorded one. Where a case
// mutates a document, its expected value comes from the mutated record, and any
// current-file size it prints is a labelled observation asserted against nothing.
//
// Safety: an isolated mkdtemp home/data/exports/tmp, synthetic ffmpeg media
// only, a discovered free loopback port asserted to be neither 3847 nor the
// configured studio port, no AI call, no network and no user media. The running
// studio is never started, stopped or contacted. Requires `npm run build` and
// the Remotion bundle cache.
//
// Usage: node scripts/verification/check-editor-read-contract.mjs [--out <dir>]
//                                                                [--self-check-only]
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync,
  statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = outIndex === -1 ? null : resolve(args[outIndex + 1]);
const selfCheckOnly = args.includes('--self-check-only');

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/editor-read-contract-'));
for (const dir of ['home', 'data', 'data/working', 'data/cache', 'exports', 'tmp', 'media', 'oracle']) {
  mkdirSync(join(fixture, dir), { recursive: true });
}
writeFileSync(join(fixture, 'empty.env'), '');
const home = join(fixture, 'home');
const exportsDir = join(fixture, 'exports');
const fixtureEnv = {
  ...env,
  PODCLI_HOME: home, PODCLI_DATA: join(fixture, 'data'), PODCLI_OUTPUT: exportsDir,
  PODCLI_CWD: home, PODCLI_ENV_FILE: join(fixture, 'empty.env'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
};
Object.assign(process.env, fixtureEnv);

const run = (exe, args_, opts = {}) => execFileSync(exe, args_, {
  env: process.env, windowsHide: true, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024, ...opts,
});
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const j = v => JSON.stringify(v);

// ---------------------------------------------------------------------------
// Result accounting: conformance failures are results, not crashes.
// ---------------------------------------------------------------------------

class ConformanceFailure extends Error {
  constructor(message) { super(message); this.name = 'ConformanceFailure'; }
}
const fail = message => { throw new ConformanceFailure(message); };
const must = (condition, message) => { if (!condition) fail(message); };
const equal = (actual, expected, label) => {
  if (!isDeepStrictEqual(actual, expected)) fail(`${label}: got ${j(actual)}, expected ${j(expected)}`);
};
const within = (actual, expected, tolerance, label) => {
  must(typeof actual === 'number' && Number.isFinite(actual), `${label}: got ${j(actual)}, expected a finite number`);
  must(Math.abs(actual - expected) <= tolerance,
    `${label}: got ${actual}, expected ${expected} within ${tolerance} (off by ${Math.abs(actual - expected)})`);
};

/**
 * Run every assertion, then fail once carrying all of them. Used where a first
 * failure would otherwise leave later leaves unasserted and so turn one
 * application failure into a coverage gap as well.
 */
const allOf = (...assertions) => {
  const problems = [];
  for (const assertion of assertions) {
    try { assertion(); } catch (error) {
      if (error instanceof ConformanceFailure) problems.push(error.message);
      else throw error;
    }
  }
  if (problems.length) fail(problems.join(' | '));
};

const cases = [];
const counts = { pass: 0, fail: 0, harness: 0 };
const verifierCounts = { pass: 0, fail: 0, harness: 0 };
async function record(lane, id, acceptance, title, body) {
  const entry = { lane, id, acceptance, title, status: 'pass', detail: null, observed: null };
  try {
    entry.observed = (await body(entry)) ?? entry.observed;
  } catch (error) {
    if (error instanceof ConformanceFailure) { entry.status = 'fail'; entry.detail = error.message; }
    else { entry.status = 'harness'; entry.detail = `${error.name}: ${error.message}`; }
  }
  (lane === 'verifier' ? verifierCounts : counts)[entry.status]++;
  cases.push(entry);
  const tag = entry.status === 'pass' ? 'ok  ' : entry.status === 'fail' ? 'FAIL' : 'HARN';
  console.log(`  ${tag} ${id.padEnd(6)} ${title}`);
  if (entry.detail) console.log(`         ${entry.detail}`);
  return entry;
}
/** An application conformance case: a failure here is a failed application result. */
const conformance = (id, acceptance, title, body) => record('application', id, acceptance, title, body);
/** A check of this runner's own accounting: a failure here is an artifact defect. */
const verifier = (id, acceptance, title, body) => record('verifier', id, acceptance, title, body);

// ---------------------------------------------------------------------------
// Projection coverage ledger: what was actually asserted about each response
// leaf, with which kind of check, and against which source of expected value.
//
// A parent never credits an unchecked child. The one exception is a complete
// object or array comparison: `isDeepStrictEqual` against a fully specified
// expected value compares the structure too, so an extra or missing descendant
// makes that comparison fail rather than being silently absorbed. Only that
// kind reaches down.
// ---------------------------------------------------------------------------

/** Kinds of check, so a credited leaf is never described as more than it is. */
const KINDS = {
  equality: 'compared with an independently derived expected value',
  'deep-equality': 'complete object/array comparison, structure included; credits its descendants',
  tolerance: 'numeric comparison inside a stated allowance',
  enumeration: 'membership of a published code list, plus a stated consistency rule',
  format: 'matched against a stated pattern',
  shape: 'type, non-empty and no path leak only; not semantic equality',
  marker: 'container reached; credits this exact path only',
};
const EXPANDS = new Set(['deep-equality']);
// How much each kind establishes, so two checks on one path keep the stronger
// claim and a later weaker one can never quietly downgrade it.
const STRENGTH = ['marker', 'shape', 'format', 'enumeration', 'tolerance', 'equality', 'deep-equality'];

function leafPaths(value, prefix, out = []) {
  if (Array.isArray(value)) {
    if (value.length === 0) out.push(prefix);
    else value.forEach((item, i) => leafPaths(item, `${prefix}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) out.push(prefix);
    else for (const key of keys) leafPaths(value[key], prefix ? `${prefix}.${key}` : key, out);
  } else out.push(prefix);
  return out;
}

class Ledger {
  constructor(name) { this.name = name; this.entries = new Map(); }
  note(path, kind, source) {
    assert(kind in KINDS, `unknown check kind ${kind}`);
    const existing = this.entries.get(path);
    // A stronger claim about the same path wins; a weaker one never downgrades it.
    if (!existing || STRENGTH.indexOf(kind) > STRENGTH.indexOf(existing.kind)) {
      this.entries.set(path, { kind, source });
    }
    return path;
  }
  /** The check that credits `path`, or null. Only an expanding entry reaches down. */
  creditFor(path) {
    const exact = this.entries.get(path);
    if (exact) return { via: path, ...exact };
    for (const [candidate, entry] of this.entries) {
      if (!EXPANDS.has(entry.kind)) continue;
      if (path.startsWith(`${candidate}.`) || path.startsWith(`${candidate}[`)) return { via: candidate, ...entry };
    }
    return null;
  }
  /** Every leaf under `prefix` of `value`, credited or not, broken down by kind. */
  audit(claim, value, prefix = '') {
    const leaves = leafPaths(value, prefix);
    const gaps = [];
    const byKind = {};
    for (const leaf of leaves) {
      const credit = this.creditFor(leaf);
      if (!credit) { gaps.push(leaf); continue; }
      byKind[credit.kind] = (byKind[credit.kind] ?? 0) + 1;
    }
    return {
      claim, ledger: this.name, scope: prefix || '(whole response)',
      leaves: leaves.length, compared: leaves.length - gaps.length,
      by_kind: byKind, gaps,
      gap_shapes: [...new Set(gaps.map(p => p.replace(/\[\d+\]/g, '[]')))].sort(),
    };
  }
}

const trackedLedger = new Ledger('tracked-revision-response');
const legacyLedger = new Ledger('legacy-recovery-response');
const artifactLedger = new Ledger('present-artifact-response');
/** The response bodies the required-coverage claims are evaluated against. */
const LEDGERED = { tracked: null, legacy: null, artifact: null };
let active = trackedLedger;
const withLedger = async (ledger, body) => {
  const previous = active;
  active = ledger;
  try { return await body(); } finally { active = previous; }
};

/** A complete comparison with an independently derived expected value. */
const field = (path, actual, expected, source = 'derived from the stored records') => {
  active.note(path, expected !== null && typeof expected === 'object' ? 'deep-equality' : 'equality', source);
  equal(actual, expected, path);
};
const nearField = (path, actual, expected, tolerance, source = 'derived from the producer') => {
  active.note(path, 'tolerance', `${source} (±${tolerance})`);
  within(actual, expected, tolerance, path);
};
/** A value whose exact text is not settled anywhere: type, content and no path leak. */
const prose = (path, value) => {
  active.note(path, 'shape', 'explanatory text: type, non-empty, no path leak');
  must(typeof value === 'string' && value.length > 0, `${path}: expected explanatory text, got ${j(value)}`);
  must(!value.includes(fixture) && !value.includes(home), `${path}: leaks a filesystem path`);
};
const patterned = (path, value, pattern, source) => {
  active.note(path, 'format', source);
  must(typeof value === 'string' && pattern.test(value), `${path}: ${j(value)} does not match ${pattern}`);
};
/**
 * Membership of a published enumeration, plus one named rule the value must
 * satisfy. Recorded as `enumeration`, not as an independent equality.
 */
const enumerated = (path, value, allowed, source, rule = null) => {
  active.note(path, 'enumeration', rule ? `${source}; ${rule.why}` : source);
  must(allowed.includes(value), `${path}: ${j(value)} is not one of the published codes`);
  if (rule) must(rule.holds, `${path}: ${j(value)} ${rule.why}`);
};
/** A container this run reached. It credits its own path and nothing below it. */
const marker = (path, source) => active.note(path, 'marker', source);

// The published response vocabularies, from the shared type declaration in
// src/models/clip-editor-context.ts. That file is the contract both sides of
// the wire are written against, not the validator this run examines.
const MODEL_CONTRACT = 'src/models/clip-editor-context.ts';
const CAPABILITY_IDS = [
  'play_committed_media', 'download_committed_media', 'edit_writing_metadata', 'known_effective_cuts',
  'widen_from_source_words', 'reopen_source_media', 'save_revision', 'adopt_for_revision_tracking',
];
const REASON_CODES = [
  'AVAILABLE', 'WRITE_ROUTE_NOT_AVAILABLE', 'MEDIA_MISSING', 'MEDIA_NOT_A_FILE', 'MEDIA_UNREADABLE',
  'MEDIA_PATH_UNRECORDED', 'SOURCE_MISSING', 'SOURCE_NOT_A_FILE', 'SOURCE_UNREADABLE', 'SOURCE_PATH_UNRECORDED',
  'TRANSCRIPT_UNAVAILABLE', 'TRANSCRIPT_EMPTY', 'TRANSCRIPT_BOUNDED_ONLY', 'TRANSCRIPT_MALFORMED',
  'COMMITTED_MEDIA_SUMMARY_DRIFT', 'MEDIA_KIND_UNSUPPORTED', 'LEGACY_TIMING_UNPROVEN',
];
const DIAGNOSTIC_CODES = [
  'LEGACY_TIMING_UNPROVEN', 'LEGACY_FIELD_CONFLICT', 'LEGACY_WORDS_BOUNDED', 'SIDECAR_MALFORMED',
  'SIDECAR_UNREADABLE', 'SIDECAR_EMPTY', 'LEGACY_ENTRY_MALFORMED', 'TRANSCRIPT_TRUNCATED',
  'DOCUMENT_PREDATES_FINAL_COMPOSITION', 'BOOKEND_JOIN_INPUTS_ABSENT', 'COMMITTED_MEDIA_SUMMARY_DRIFT',
  'MEDIA_KIND_UNSUPPORTED', 'MEDIA_MISSING', 'SOURCE_MISSING', 'PENDING_OPERATION', 'OPERATION_FAILED',
  'THUMBNAIL_BAKE_UNKNOWN', 'DEMO_FIXTURE',
];

/**
 * Every capability row, leaf by leaf. `available` always has an external
 * expected value; `reason` has one where an independent source names it, and
 * otherwise carries the published enumeration plus the rule that only an
 * available capability may report AVAILABLE. The rows run through allOf so one
 * wrong value cannot leave the rest of the array uncompared.
 */
const capabilityLedger = (capabilities, expectations) => {
  allOf(
    () => equal(capabilities.map(c => c.id), CAPABILITY_IDS, 'the capability list against the published ids'),
    ...capabilities.flatMap((capability, index) => {
      const at = `capabilities[${index}]`;
      const want = expectations[capability.id] ?? {};
      return [
        () => field(`${at}.id`, capability.id, CAPABILITY_IDS[index], `${MODEL_CONTRACT} EditorCapabilityId order`),
        () => must('available' in want, `${at}.id ${capability.id}: no expectation was declared for it`),
        () => field(`${at}.available`, capability.available, want.available, want.source ?? 'derived'),
        () => (want.reason === undefined
          ? enumerated(`${at}.reason`, capability.reason, REASON_CODES, `${MODEL_CONTRACT} EditorReasonCode`, {
            holds: capability.available ? capability.reason === 'AVAILABLE' : capability.reason !== 'AVAILABLE',
            why: capability.available
              ? 'is reported for an available capability, which must report AVAILABLE'
              : 'is reported for an unavailable capability, which must not report AVAILABLE',
          })
          : field(`${at}.reason`, capability.reason, want.reason, want.reasonSource ?? want.source ?? 'derived')),
        () => prose(`${at}.detail`, capability.detail),
      ];
    }),
  );
};

/**
 * Every diagnostic row, leaf by leaf. The code multiset is an independently
 * derived expectation: it is what this fixture's own anomalies require. `scope`
 * is a shape check, except that the field-conflict diagnostics must correspond
 * one-to-one with the fields the fixture actually makes disagree.
 */
const diagnosticLedger = (diagnostics, expectedCodes, conflictFields = null) => {
  const sorted = xs => [...xs].sort();
  // An empty list has no row to compare, but its emptiness was compared: record
  // that as the equality it is rather than leaving the container marker to stand
  // for it.
  if (diagnostics.length === 0) {
    active.note('diagnostics', 'equality', 'the empty list was compared with the anomalies this fixture has, which are none');
  }
  allOf(
    () => equal(sorted(diagnostics.map(d => d.code)), sorted(expectedCodes),
      "the diagnostic codes against the anomalies this fixture actually has"),
    ...diagnostics.flatMap((diagnostic, index) => {
      const at = `diagnostics[${index}]`;
      return [
        () => enumerated(`${at}.code`, diagnostic.code, DIAGNOSTIC_CODES, `${MODEL_CONTRACT} EditorDiagnosticCode`),
        () => {
          active.note(`${at}.scope`, 'shape', 'a dotted response path, no whitespace or filesystem separator');
          must(typeof diagnostic.scope === 'string' && /^[A-Za-z0-9_.[\]]+$/.test(diagnostic.scope),
            `${at}.scope: ${j(diagnostic.scope)} is not a dotted response path`);
        },
        () => prose(`${at}.detail`, diagnostic.detail),
      ];
    }),
    () => {
      if (!conflictFields) return;
      const scopes = diagnostics.filter(d => d.code === 'LEGACY_FIELD_CONFLICT')
        .map(d => d.scope.split('.').pop());
      equal(sorted(scopes), sorted(conflictFields),
        'the field-conflict diagnostics do not name the fields the fixture makes disagree');
    },
  );
};

/**
 * The two conclusions this run reports, and the exit code they produce. They
 * are separate: failed application conformance is a product result, and missing
 * required coverage is an incomplete artifact. Either one exits nonzero.
 */
const conclude = (applicationCounts, selfCounts, audits) => {
  const gaps = audits.reduce((total, audit) => total + audit.gaps.length, 0);
  const application = applicationCounts.harness ? 'harness' : applicationCounts.fail ? 'fail' : 'pass';
  const coverage = gaps || selfCounts.fail || selfCounts.harness ? 'incomplete' : 'complete';
  return { application, coverage, exit: application === 'pass' && coverage === 'complete' ? 0 : 1 };
};

/** This runner's own files, so a result belongs to exactly the artifacts that produced it. */
const artifactIdentities = () => Object.fromEntries([
  'scripts/verification/check-editor-read-contract.mjs',
  'scripts/verification/fixtures/editor-read-contract/producer-oracle.py',
].map(p => [p, sha256(join(projectRoot, p))]));

// ---------------------------------------------------------------------------
// Verifier self-checks: the accounting above, held to its own rules. No
// application, fixture or request is involved. A failure here is an artifact
// defect, counted apart from application conformance.
// ---------------------------------------------------------------------------

console.log('Verifier self-checks over the coverage accounting...');

await verifier('V-1', 'B2B2-5', 'an existing sibling leaf that nothing asserted is reported as a gap', () => {
  const ledger = new Ledger('self-check');
  ledger.note('a.b', 'equality', 'self-check');
  const audit = ledger.audit('self-check', { a: { b: 1, c: 2 } });
  equal(audit.gaps, ['a.c'], 'an unasserted sibling was credited');
  equal(audit.compared, 1, 'the compared count');
  return audit;
});

await verifier('V-2', 'B2B2-5', 'a child added under a bare container marker is reported as a gap', () => {
  const ledger = new Ledger('self-check');
  ledger.note('capabilities', 'marker', 'self-check');
  ledger.note('capabilities[0].id', 'equality', 'self-check');
  const before = ledger.audit('self-check', { capabilities: [{ id: 'x' }] });
  const after = ledger.audit('self-check', { capabilities: [{ id: 'x', newly_added: true }] });
  equal(before.gaps, [], 'a fully asserted array reported a gap');
  equal(after.gaps, ['capabilities[0].newly_added'], 'a new child under a marked parent was credited automatically');
  return { before: before.gaps.length, after: after.gaps };
});

await verifier('V-3', 'B2B2-5', 'a complete comparison credits its descendants, and an added descendant fails it', () => {
  const ledger = new Ledger('self-check');
  const expected = { b: 1, c: 2 };
  const previous = active;
  active = ledger;
  let addedDescendantFailed = false;
  try {
    field('a', { b: 1, c: 2 }, expected, 'self-check');
    try { field('a', { b: 1, c: 2, d: 3 }, expected, 'self-check'); } catch (error) {
      addedDescendantFailed = error instanceof ConformanceFailure;
    }
  } finally { active = previous; }
  const audit = ledger.audit('self-check', { a: { b: 1, c: 2 } });
  equal(audit.gaps, [], 'a complete comparison did not credit its own descendants');
  equal(audit.by_kind, { 'deep-equality': 2 }, 'the credited kind');
  must(addedDescendantFailed, 'an added descendant was absorbed instead of failing the comparison');
  return audit.by_kind;
});

await verifier('V-4', 'B2B2-5', 'type, non-empty and redaction checks are recorded as shape, never as equality', () => {
  const ledger = new Ledger('self-check');
  const previous = active;
  active = ledger;
  try {
    prose('note', 'some explanatory text');
    patterned('stamp', '2026-09-22T00:00:00.000Z', /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/, 'self-check');
    marker('container', 'self-check');
    field('exact', 7, 7, 'self-check');
    // A weaker check on a path already compared must not downgrade its record.
    prose('exact', 'some explanatory text about the same path');
  } finally { active = previous; }
  equal(ledger.entries.get('note').kind, 'shape', 'prose was recorded as something other than shape');
  equal(ledger.entries.get('stamp').kind, 'format', 'a pattern check was recorded as something else');
  equal(ledger.entries.get('container').kind, 'marker', 'a container marker was recorded as something else');
  equal(ledger.entries.get('exact').kind, 'equality',
    'a later shape check downgraded a path that had already been compared exactly');
  must(!EXPANDS.has('shape') && !EXPANDS.has('marker') && !EXPANDS.has('format'),
    'a non-comparing kind is allowed to credit descendants');
  return Object.fromEntries([...ledger.entries].map(([k, v]) => [k, v.kind]));
});

await verifier('V-5', 'B2B2-5', 'a required coverage gap makes the run incomplete and nonzero with zero failing cases', () => {
  const complete = conclude({ pass: 5, fail: 0, harness: 0 }, { pass: 1, fail: 0, harness: 0 },
    [{ claim: 'demo', gaps: [] }]);
  const withGap = conclude({ pass: 5, fail: 0, harness: 0 }, { pass: 1, fail: 0, harness: 0 },
    [{ claim: 'demo', gaps: ['timing.something_new'] }]);
  equal(complete, { application: 'pass', coverage: 'complete', exit: 0 }, 'the all-clear conclusion');
  equal(withGap, { application: 'pass', coverage: 'incomplete', exit: 1 }, 'the conclusion for a required gap');
  const withFailure = conclude({ pass: 4, fail: 1, harness: 0 }, { pass: 1, fail: 0, harness: 0 },
    [{ claim: 'demo', gaps: [] }]);
  equal(withFailure, { application: 'fail', coverage: 'complete', exit: 1 },
    'a failed application case with complete coverage');
  return { complete, withGap, withFailure };
});

if (selfCheckOnly) {
  const target = outDir ?? fixture;
  mkdirSync(target, { recursive: true });
  const path = join(target, 'check-editor-read-contract-self-check.json');
  writeFileSync(path, JSON.stringify({
    check: 'check-editor-read-contract --self-check-only',
    spec_revision: 'lead-21', workflow_version: '4.1.0',
    instruction_inventory: 'docs/workflow/inventories/4.1.0-local-2.md',
    ran_at: new Date().toISOString(), kinds: KINDS,
    verification_artifacts: artifactIdentities(),
    verifier: verifierCounts, cases,
  }, null, 2));
  console.log('');
  console.log(`Verifier self-checks: ${verifierCounts.pass} passed, ${verifierCounts.fail} failed, ${verifierCounts.harness} harness error(s).`);
  console.log(`Result: ${path}`);
  console.log(verifierCounts.fail || verifierCounts.harness ? 'FAILED: the coverage accounting does not hold to its own rules.' : 'Passed');
  process.exit(verifierCounts.fail || verifierCounts.harness ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Synthetic media. Every source second has its own colour and tone.
// ---------------------------------------------------------------------------

console.log('Building synthetic media...');
const COLOURS = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
const source = join(fixture, 'media/source.mp4');
{
  const a = ['-v', 'error', '-y'];
  for (const c of COLOURS) a.push('-f', 'lavfi', '-i', `color=c=${c}:s=1280x720:r=25:d=1`);
  for (let i = 0; i < COLOURS.length; i++) a.push('-f', 'lavfi', '-i', `sine=frequency=${300 + 200 * i}:sample_rate=44100:duration=1`);
  const chain = COLOURS.map((_, i) => `[${i}:v][${COLOURS.length + i}:a]`).join('');
  a.push('-filter_complex', `${chain}concat=n=${COLOURS.length}:v=1:a=1[v][a]`, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', source);
  run(settings.FFMPEG_PATH, a);
}
const asset = (name, colour, hz, seconds) => {
  const path = join(fixture, `media/${name}.mp4`);
  run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${colour}:s=640x360:r=25:d=${seconds}`,
    '-f', 'lavfi', '-i', `sine=frequency=${hz}:sample_rate=44100:duration=${seconds}`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path]);
  return path;
};
const introAsset = asset('intro', 'white', 2600, 1);
const outroAsset = asset('outro', 'purple', 2400, 1);
const cardImage = join(fixture, 'media/card.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=1', '-frames:v', '1', cardImage]);
const poster = join(fixture, 'media/poster.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=white:s=1280x720:d=1', '-frames:v', '1', poster]);

// Overlap, straddle, boundary touch and exclusion, all in one supplied list.
const KEEP = [{ start: 4, end: 5 }, { start: 1, end: 2 }];
const WORDS = [
  { word: 'alpha', start: 0.2, end: 0.7, confidence: 0.9, speaker: 'S0' },
  { word: 'bravo', start: 1.0, end: 1.6, confidence: 0.8, speaker: 'S1' },
  { word: 'charlie', start: 1.4, end: 1.9, confidence: 0.7, speaker: 'S0' },
  { word: ' delta ', start: 1.8, end: 2.4, confidence: 0.6, speaker: 'S1' },
  { word: 'echo', start: 2.0, end: 2.5, confidence: 0.5, speaker: 'S0' },
  { word: 'foxtrot', start: 3.9, end: 4.3, confidence: 0.4, speaker: 'S1' },
  { word: 'golf', start: 4.4, end: 4.9, confidence: 0.3, speaker: 'S0' },
];

// ---------------------------------------------------------------------------
// The frozen compiled application.
// ---------------------------------------------------------------------------

const dist = name => pathToFileURL(join(projectRoot, 'dist', name)).href;
const { PythonExecutor } = await import(dist('services/python-executor.js'));
const { ClipsHistory } = await import(dist('services/clips-history.js'));
const { ClipRevisionService } = await import(dist('services/clip-revisions.js'));
const { paths } = await import(dist('config/paths.js'));
assert.equal(paths.output, exportsDir);
assert.equal(paths.history, join(home, 'history'));

const historyPath = join(home, 'history', 'clips.json');
const entries = () => JSON.parse(readFileSync(historyPath, 'utf8'));
const entryOf = id => entries().find(e => e.id === id);
const history = new ClipsHistory();
const executor = new PythonExecutor(20 * 60 * 1000);
const svc = new ClipRevisionService({ history });
const expectedOf = s => ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });
const baseRecipe = (over = {}) => ({
  source_video: source, title: 'read-contract', keep_segments: KEEP.map(s => ({ ...s })),
  caption_style: 'karaoke', caption_position: 'auto', caption_font_scale: 100,
  crop_strategy: 'center', format: 'vertical', clean_fillers: false, ...over,
});

console.log('Rendering one real legacy clip for the serving matrix...');
const legacy = (await executor.execute('create_clip', {
  video_path: source, transcript_words: WORDS, caption_style: 'karaoke', crop_strategy: 'center',
  format: 'vertical', clean_fillers: false, output_dir: exportsDir, title: 'read-contract-legacy',
  start_second: 1, end_second: 5,
})).data;

/** Commit one real revision on its own clip and return its records. */
async function committed(label, { recipe = {}, words = WORDS, card = null, title = label }) {
  const clip = await history.record({
    source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke',
    crop_strategy: 'center', format: 'vertical', title, output_path: legacy.output_path,
    file_size_mb: legacy.file_size_mb, duration: legacy.duration,
    transcript_slice: 'bravo charlie delta',
  });
  await svc.ensureTracked(clip.id);
  const request = {
    clip_id: clip.id, operation_id: `op-${label}`, expected: expectedOf(entryOf(clip.id).revisions),
    recipe: baseRecipe(recipe), source_words: words,
  };
  if (card) request.thumbnail_card = card;
  const saved = await svc.saveRevision(request);
  assert.equal(saved.outcome, 'committed', `${label}: ${j(saved.operation?.error)}`);
  const pointer = entryOf(clip.id).revisions.current;
  return { label, id: clip.id, pointer, documentPath: pointer.path, document: JSON.parse(readFileSync(pointer.path, 'utf8')) };
}

console.log('Committing real revisions through the accepted producers...');
const CARD = await committed('card', {
  card: { image_path: cardImage, image_sha256: sha256(cardImage), placement: 'opening', duration: 1.5 },
});
// A draft beside the committed revision, so the draft projection has a real source.
await svc.saveDraft({
  clip_id: CARD.id, expected: expectedOf(entryOf(CARD.id).revisions),
  draft: {
    recipe: baseRecipe({ title: 'read-contract-draft' }), source_words: WORDS,
    thumbnail_card: { image_path: cardImage, image_sha256: sha256(cardImage), placement: 'opening', duration: 1.5 },
    note: 'draft beside the committed revision',
  },
});
CARD.state = entryOf(CARD.id).revisions;
CARD.draftDocument = JSON.parse(readFileSync(CARD.state.draft.path, 'utf8'));

const INTRO = await committed('intro', { recipe: { intro_path: introAsset, bookend_fade: 0.25 } });
const OUTRO = await committed('outro', { recipe: { outro_path: outroAsset, bookend_fade: 0.25 } });
const BOTH = await committed('both', { recipe: { intro_path: introAsset, outro_path: outroAsset, bookend_fade: 0.25 } });
const HARD = await committed('hard', { recipe: { intro_path: introAsset, outro_path: outroAsset, bookend_fade: 0 } });
const EMPTY = await committed('empty', { words: [] });
const NONE = await committed('none', { words: null });
// A present-artifact save (lead-20 CP-2). `keep_caption_overlay` makes the
// renderer publish the alpha caption overlay and the cropped source beside the
// main file, and the opening card puts the content at a non-zero offset, so a
// placement at the content offset is distinguishable from one at zero.
const OVERLAY = await committed('overlay', {
  recipe: { keep_caption_overlay: true },
  card: { image_path: cardImage, image_sha256: sha256(cardImage), placement: 'opening', duration: 1.5 },
});
assert(OVERLAY.document.files.caption_overlay && OVERLAY.document.files.cropped_source,
  'the keep_caption_overlay save published no sidecars, so the present-artifact control has no subject');

// --- the serving matrix's files, all created before the fixture is hashed ----
const media = name => join(fixture, 'media', name);
copyFileSync(legacy.output_path, media('plain.mp4'));
copyFileSync(legacy.output_path, media('plain.avi'));
copyFileSync(legacy.output_path, media('target.avi'));
copyFileSync(legacy.output_path, media('target.mp4'));
mkdirSync(media('folder.mp4'));
symlinkSync(media('target.avi'), media('nominal.mp4'), 'file');
symlinkSync(media('target.mp4'), media('nominal.avi'), 'file');
symlinkSync(media('never-created.mp4'), media('gone.mp4'), 'file');

/** One untracked legacy entry whose own output summary is `output`. */
async function legacyClip(title, output) {
  const clip = await history.record({
    source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke',
    crop_strategy: 'center', format: 'vertical', title, output_path: output,
    file_size_mb: legacy.file_size_mb, duration: legacy.duration,
    transcript_slice: 'bravo charlie delta', keep_segments: [{ start: 1, end: 2 }, { start: 4, end: 5 }],
    unknown_field: { kept: true },
  });
  return clip.id;
}
const SERVE = {
  plainMp4: await legacyClip('serve plain mp4', media('plain.mp4')),
  plainAvi: await legacyClip('serve plain avi', media('plain.avi')),
  folder: await legacyClip('serve a directory', media('folder.mp4')),
  linkToAvi: await legacyClip('serve a supported name over an unsupported file', media('nominal.mp4')),
  linkToMp4: await legacyClip('serve an unsupported name over a supported file', media('nominal.avi')),
  dangling: await legacyClip('serve a dangling link', media('gone.mp4')),
};

// --- one legacy clip with a full set of recovery inputs beside it -----------
const BOUNDED = WORDS.filter(w => w.start >= 1 && w.start < 5);
const LEGACY_RECIPE = {
  caption_style: 'hormozi', crop_strategy: 'center', format: 'square', clean_fillers: false,
  keep_segments: [{ start: 0, end: 3 }], transcript_words: BOUNDED, unknown_future_field: { kept: true },
};
const LEGACY_REFRAME = { inSec: 2.5, outSec: 5, keyframes: [{ tAbs: 3, x_pct: 40 }] };
const RICH = await (async () => {
  const clip = await history.record({
    source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke',
    crop_strategy: 'center', format: 'vertical', title: 'Legacy recovery inputs',
    output_path: media('plain.mp4'), file_size_mb: legacy.file_size_mb, duration: legacy.duration,
    transcript_slice: 'bravo charlie delta', description: 'Legacy description', hashtags: '#a #b',
    keep_segments: [{ start: 1, end: 2 }, { start: 4, end: 5 }],
    thumbnail_config: { preview_path: poster, card_seconds: 1.5, text: 'Two lines' },
    unknown_field: { kept: true },
  });
  for (const [dir, value] of [['words', BOUNDED], ['recipes', LEGACY_RECIPE], ['reframe', LEGACY_REFRAME]]) {
    mkdirSync(join(home, 'history', dir), { recursive: true });
    writeFileSync(join(home, 'history', dir, clip.id + '.json'), JSON.stringify(value, null, 2));
  }
  return clip.id;
})();

// ---------------------------------------------------------------------------
// Genuine accepted pre-composition documents, copied in byte for byte.
// ---------------------------------------------------------------------------

console.log('Installing the genuine historical documents...');
const historicalSource = join(projectRoot, '_local/project/evidence/writing-studio/1b-2b-2-reassessment/historical-profiles.json');
const historicalProfiles = JSON.parse(readFileSync(historicalSource, 'utf8'));
const historicalOriginals = {};
const HIST = [];
{
  // Two documents of one genuine clip: its current revision and its previous one.
  const byClip = new Map();
  for (const profile of historicalProfiles) {
    assert.equal(sha256(profile.path), profile.sha256, `historical profile changed on disk: ${profile.path}`);
    historicalOriginals[profile.path] = profile.sha256;
    const document = JSON.parse(readFileSync(profile.path, 'utf8'));
    assert.equal(document.final_composition, undefined, 'a historical profile already has a final composition');
    if (!byClip.has(document.clip_id)) byClip.set(document.clip_id, []);
    byClip.get(document.clip_id).push({ profile, document });
  }
  for (const [clipId, docs] of byClip) {
    docs.sort((a, b) => a.document.version - b.document.version);
    const latest = docs[docs.length - 1];
    const sidecar = join(home, 'history', 'revisions', clipId);
    mkdirSync(sidecar, { recursive: true });
    const pointerFor = entry => {
      const target = join(sidecar, `${entry.document.revision_id}.json`);
      copyFileSync(entry.profile.path, target);
      assert.equal(sha256(target), entry.profile.sha256, 'the historical copy is not byte identical');
      return {
        revision_id: entry.document.revision_id, version: entry.document.version, path: target,
        output_path: entry.document.files.main.path, group_root: entry.document.group_root,
        operation_id: entry.document.operation_id, provenance: 'exact',
        committed_at: entry.document.created_at,
      };
    };
    const current = pointerFor(latest);
    const previous = docs.length > 1 ? pointerFor(docs[docs.length - 2]) : null;
    const record = {
      id: clipId, title: `historical ${clipId.slice(0, 8)}`, source_video: latest.document.recipe.source_video,
      start_second: 0, end_second: 0, caption_style: latest.document.recipe.caption_style,
      crop_strategy: latest.document.recipe.crop_strategy, format: latest.document.recipe.format,
      output_path: latest.document.files.main.path, duration: latest.document.probe.duration,
      file_size_mb: Number((latest.document.files.main.bytes / (1024 * 1024)).toFixed(3)),
      created_at: latest.document.created_at,
      revisions: {
        schema: 1, incarnation: latest.document.incarnation, draft_version: 0,
        revision_version: latest.document.version, draft: null, current, previous, operations: [],
        roots: { namespace: dirname(latest.document.group_root), sidecars: sidecar },
      },
    };
    const list = existsSync(historyPath) ? entries() : [];
    list.push(record);
    writeFileSync(historyPath, JSON.stringify(list, null, 2));
    HIST.push({
      id: clipId, documentPath: current.path, document: latest.document, pointer: current,
      previousPath: previous ? previous.path : null,
      previousDocument: docs.length > 1 ? docs[docs.length - 2].document : null,
    });
  }
}
assert(HIST.length >= 1, 'no genuine historical clip was installed');

// ---------------------------------------------------------------------------
// The producer oracle, out of process.
// ---------------------------------------------------------------------------

const oracleScript = join(projectRoot, 'scripts/verification/fixtures/editor-read-contract/producer-oracle.py');
function oracle(jobs) {
  const jobFile = join(fixture, 'oracle', `jobs-${jobs.length}-${Date.now()}.json`);
  const resultFile = `${jobFile}.result.json`;
  writeFileSync(jobFile, JSON.stringify({ jobs }, null, 2));
  run(settings.PYTHON_PATH, [oracleScript, jobFile, resultFile], { cwd: projectRoot });
  const parsed = JSON.parse(readFileSync(resultFile, 'utf8'));
  for (const [id, result] of Object.entries(parsed.results)) {
    assert(result.ok, `producer oracle job ${id} failed: ${result.error}`);
  }
  return Object.fromEntries(Object.entries(parsed.results).map(([id, r]) => [id, r.value]));
}

console.log('Deriving expectations from the Python producer...');
const bookendJobs = [];
const bookendKeys = new Map();
for (const set of [INTRO, OUTRO, BOTH, HARD]) {
  for (const kind of ['intro', 'outro']) {
    const saved = set.document.bookends?.[kind];
    if (!saved || !saved.join_inputs) continue;
    const key = `${set.label}-${kind}`;
    bookendKeys.set(key, { set, kind, saved });
    bookendJobs.push({
      id: key, op: 'bookend', kind,
      // Re-derive the region from the join report this record itself preserves.
      report: {
        applied_overlap: saved.applied_overlap, main_duration: saved.join_inputs.main_duration,
        appended_duration: saved.join_inputs.appended_duration, requested_fade: saved.requested_fade,
        branch: saved.branch, output_duration: saved.measured_output_duration,
      },
      output_start: kind === 'intro' ? 0 : saved.output_start + saved.applied_overlap,
    });
  }
}
// The served-word limit the response contract publishes, and one word past it.
// Adapted from the fresh review's supplemental control: the whole list is mapped
// by the same out-of-process producer, so the document stays coherent and the
// only question left is what the response does above its own limit.
const WORD_LIMIT = 20000;
const LARGE_TAIL = 'TAIL';
const LARGE_WORDS = Array.from({ length: WORD_LIMIT + 1 }, (_, i) => ({
  word: i === WORD_LIMIT ? LARGE_TAIL : ` w${i} `, start: 1.1, end: 1.3, speaker: 'S', confidence: 0.9,
}));

const ORACLE = oracle([
  { id: 'card-words', op: 'map_words', words: WORDS, segments: KEEP },
  { id: 'empty-words', op: 'map_words', words: [], segments: KEEP },
  { id: 'large-words', op: 'map_words', words: LARGE_WORDS, segments: CARD.document.recipe.keep_segments },
  ...HIST.map((h, i) => ({
    id: `hist-words-${i}`, op: 'map_words',
    words: h.document.source_words ?? [], segments: h.document.recipe.keep_segments,
  })),
  ...bookendJobs,
]);
const LARGE = ORACLE['large-words'];
assert.equal(LARGE.content.length, WORD_LIMIT + 1, 'the producer did not map every supplied large-transcript word');

// ---------------------------------------------------------------------------
// The fixture, before any request.
// ---------------------------------------------------------------------------

function hashTree(dir) {
  const out = {};
  const walk = d => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (item.isSymbolicLink()) { out[p] = 'symlink'; continue; }
      if (item.isDirectory()) walk(p);
      else out[p] = sha256(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}
const beforeTree = hashTree(fixture);
const treeProblems = label => {
  const after = hashTree(fixture);
  const problems = [];
  for (const path of Object.keys(after)) if (!(path in beforeTree)) problems.push(`${label}: created ${path}`);
  for (const [path, hash] of Object.entries(beforeTree)) {
    if (!(path in after)) problems.push(`${label}: removed ${path}`);
    else if (after[path] !== hash) problems.push(`${label}: changed ${path}`);
  }
  return problems;
};

// ---------------------------------------------------------------------------
// The real studio, on a verified free loopback port.
// ---------------------------------------------------------------------------

async function freePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise(done => probe.close(done));
  assert.notEqual(String(port), settings.PODCLI_PORT, 'the discovered port is the configured studio port');
  assert.notEqual(port, 3847, 'the discovered port is the studio default');
  return port;
}
let server = null;
let base = '';
let serverLog = '';
async function startServer() {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
    cwd: fixtureEnv.PODCLI_CWD, env: { ...fixtureEnv, PODCLI_PORT: String(port) },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', c => { serverLog += c; });
  server.stderr.on('data', c => { serverLog += c; });
  for (let i = 0; ; i++) {
    assert(i < 300 && server.exitCode === null, serverLog || 'the studio failed to start');
    try { if ((await fetch(`${base}/api/local-policy`)).ok) break; } catch { /* not listening yet */ }
    await new Promise(done => setTimeout(done, 100));
  }
  return port;
}
async function stopServer() {
  if (!server) return;
  const closed = once(server, 'close');
  server.kill();
  await closed;
  server = null;
}
const context = async id => {
  const response = await fetch(`${base}/api/clips/${encodeURIComponent(id)}/editor-context`);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
};
/** What the existing by-id routes actually answer for this clip. */
const servedBy = async id => {
  const out = {};
  for (const mode of ['preview', 'download']) {
    const response = await fetch(`${base}/api/clips/${encodeURIComponent(id)}/${mode}`);
    const buffer = await response.arrayBuffer();
    out[mode] = { status: response.status, bytes: buffer.byteLength };
  }
  return out;
};

/** Run one body with a mutated copy of a JSON file, then restore its bytes. */
async function withMutation(path, mutate, body) {
  const original = readFileSync(path);
  const document = JSON.parse(original.toString('utf8'));
  mutate(document);
  writeFileSync(path, JSON.stringify(document, null, 2));
  try {
    return await body();
  } finally {
    writeFileSync(path, original);
    assert.equal(sha256(path), createHash('sha256').update(original).digest('hex'), `the mutation of ${basename(path)} was not reverted`);
  }
}
/** What a response published for the claim under test, small enough to read. */
const CLAIM = {
  transcript: body => ({
    text: body.transcript?.text, word_count: body.transcript?.word_count,
    words: (body.transcript?.words ?? []).map(w => w.word),
    widening: body.transcript?.widening_input,
  }),
  raw: body => ({
    raw_render: body.timing?.raw_render, recorded_probe: body.revision?.document?.recorded_probe,
    has_final_composition: body.revision?.document?.has_final_composition,
  }),
  bookends: body => ({
    bookends: body.revision?.document?.bookends, raw_output: body.timing?.raw_render?.output_duration,
  }),
  artifacts: body => ({
    artifacts: body.revision?.document?.artifacts,
    content_offset: body.timing?.final_composition?.content_offset,
  }),
  default: body => ({ effective_cuts_known: body.timing?.effective_cuts_known, serves: body.media?.serves }),
};
const refuses = async (path, mutate, clipId, claim = CLAIM.default, expectedCode = 'REVISION_DOCUMENT_INVALID') =>
  withMutation(path, mutate, async () => {
    const response = await context(clipId);
    const observed = { status: response.status, code: response.body?.code, keys: Object.keys(response.body ?? {}).sort() };
    if (response.status === 200) {
      observed.published = claim(response.body);
      fail(`expected ${expectedCode} (500); the contradiction was served as authoritative: ${j(observed.published)}`);
    }
    must(response.status === 500 && response.body?.code === expectedCode,
      `expected ${expectedCode} (500), got ${response.status} ${j(response.body?.code ?? response.body)}`);
    equal(observed.keys, ['code', 'error'], 'the refusal body carries more than a code and a message');
    must(!/TypeError|\bat \w+ \(/.test(j(response.body)), 'a raw exception leaked into the refusal');
    return observed;
  });
const reads = async (path, mutate, clipId) =>
  withMutation(path, mutate, async () => {
    const response = await context(clipId);
    must(response.status === 200, `expected a legitimate variation to still read, got ${response.status} ${j(response.body?.code)}`);
    return { status: response.status };
  });

console.log('Starting the studio on an isolated free port...');
const firstPort = await startServer();

const control = await context(CARD.id);
assert.equal(control.status, 200, `the control revision does not read: ${j(control.body)}`);
const CONTROL = control.body;
LEDGERED.tracked = CONTROL;

// ===========================================================================
// Editorial transcript (B2B2-1)
// ===========================================================================

console.log('Editorial transcript against the Python producer...');
const roundWord = w => ({ ...w, start: Math.round(w.start * 1000) / 1000, end: Math.round(w.end * 1000) / 1000 });

await conformance('T-C1', 'B2B2-1', 'serves exactly the words the producer projects onto the kept intervals', () => {
  const expected = ORACLE['card-words'].content.map(roundWord);
  field('transcript.words', CONTROL.transcript.words, expected);
  field('transcript.word_count', CONTROL.transcript.word_count, expected.length);
  field('transcript.availability', CONTROL.transcript.availability, 'available');
  field('transcript.provenance', CONTROL.transcript.provenance, 'saved-content-words');
  field('transcript.domain', CONTROL.transcript.domain, 'content-relative');
  field('transcript.widening_input.available', CONTROL.transcript.widening_input.available, true);
  field('transcript.widening_input.reason', CONTROL.transcript.widening_input.reason, 'AVAILABLE');
  field('transcript.widening_input.word_count', CONTROL.transcript.widening_input.word_count, WORDS.length);
  prose('transcript.detail', CONTROL.transcript.detail);
  return { served: expected.length, supplied: WORDS.length };
});

await conformance('T-C2', 'B2B2-1', 'the served text is the producer text of the words it serves', () => {
  field('transcript.text', CONTROL.transcript.text, ORACLE['card-words'].content_text);
  return { text: CONTROL.transcript.text };
});

await conformance('T-C3', 'B2B2-1', 'overlapping, straddling, boundary-touching and excluded words follow the producer', () => {
  const served = CONTROL.transcript.words ?? [];
  const names = served.map(w => w.word);
  const expected = ORACLE['card-words'].content.map(w => w.word);
  equal(names, expected, 'the served word sequence');
  must(!names.includes('alpha'), 'a word outside every kept interval is served');
  must(!names.includes('echo'), 'a word that only touches an interval boundary is served');
  must(names.filter(n => n === 'charlie').length === expected.filter(n => n === 'charlie').length,
    'an overlapping word is not retained as the producer retains it');
  return { served: names };
});

await conformance('T-C4', 'B2B2-1', 'a genuinely supplied-empty transcript stays empty, not unavailable', async () => {
  const response = await context(EMPTY.id);
  must(response.status === 200, `the supplied-empty revision does not read: ${j(response.body?.code)}`);
  equal(response.body.transcript.availability, 'empty', 'transcript.availability');
  equal(response.body.transcript.words, [], 'transcript.words');
  equal(response.body.transcript.word_count, 0, 'transcript.word_count');
  equal(response.body.transcript.text, ORACLE['empty-words'].content_text, 'transcript.text');
  equal(response.body.transcript.widening_input.reason, 'TRANSCRIPT_EMPTY', 'widening reason');
  return { availability: 'empty' };
});

await conformance('T-C5', 'B2B2-1', 'an unavailable transcript stays distinct from an empty one', async () => {
  const response = await context(NONE.id);
  must(response.status === 200, `the unavailable-transcript revision does not read: ${j(response.body?.code)}`);
  equal(response.body.transcript.availability, 'unavailable', 'transcript.availability');
  equal(response.body.transcript.words, null, 'transcript.words');
  equal(response.body.transcript.word_count, null, 'transcript.word_count');
  equal(response.body.transcript.widening_input.reason, 'TRANSCRIPT_UNAVAILABLE', 'widening reason');
  return { availability: 'unavailable' };
});

await conformance('T-C6', 'B2B2-1', 'above the served limit the count stays true, the prefix exact and the text whole', () =>
  // Adapted from the fresh review's supplemental control. Every one of the
  // 20,001 words is mapped by the producer, so nothing here is incoherent: the
  // document is exactly what a save of that transcript would have written.
  withMutation(CARD.documentPath, d => {
    d.source_words = LARGE_WORDS;
    Object.assign(d.render_timeline.words, {
      input: 'supplied', source_count: LARGE_WORDS.length,
      source: LARGE.source, content: LARGE.content, content_text: LARGE.content_text,
    });
    d.render_timeline.captions.words = LARGE.content;
  }, async () => {
    const response = await context(CARD.id);
    must(response.status === 200, `the producer-coherent large transcript does not read: ${j(response.body?.code)}`);
    const served = response.body.transcript;
    must(Array.isArray(served.words) && served.words.length === WORD_LIMIT,
      `expected exactly ${WORD_LIMIT} served words, got ${Array.isArray(served.words) ? served.words.length : j(served.words)}`);
    const diverges = LARGE.content.slice(0, WORD_LIMIT).findIndex((word, i) => !isDeepStrictEqual(word, served.words[i]));
    must(diverges === -1,
      `the served prefix leaves the producer at index ${diverges}: got ${j(served.words[diverges])}, expected ${j(LARGE.content[diverges])}`);
    equal(served.word_count, LARGE_WORDS.length, 'transcript.word_count must stay the true stored count');
    must(served.text === LARGE.content_text,
      `transcript.text is not the full producer text: ${served.text?.length} characters against ${LARGE.content_text.length}`);
    must(typeof served.text === 'string' && served.text.endsWith(LARGE_TAIL),
      'the served text stops before the last supplied word, so it is a truncated text presented as whole');
    must(response.body.diagnostics.some(x => x.code === 'TRANSCRIPT_TRUNCATED'),
      'no TRANSCRIPT_TRUNCATED diagnostic although more words are stored than are served');
    return {
      stored: LARGE_WORDS.length, served: served.words.length, word_count: served.word_count,
      text_characters: served.text.length, ends_with: LARGE_TAIL,
    };
  }));

await conformance('T-X1', 'B2B2-1', 'refuses editorial text that is not the text of the words it serves', () =>
  refuses(CARD.documentPath, d => { d.render_timeline.words.content_text = 'Speech that was never supplied'; }, CARD.id, CLAIM.transcript));

await conformance('T-X2', 'B2B2-1', 'refuses editorial words with no retained source words to derive them from', () =>
  refuses(CARD.documentPath, d => {
    d.source_words = [];
    d.render_timeline.words.source = [];
    d.render_timeline.words.source_count = 0;
  }, CARD.id, CLAIM.transcript));

await conformance('T-X3', 'B2B2-1', 'refuses an editorial word that was never supplied', () =>
  refuses(CARD.documentPath, d => {
    d.render_timeline.words.content[0].word = 'november';
    d.render_timeline.words.content_text = ORACLE['card-words'].content
      .map((w, i) => (i === 0 ? 'november' : w.word.trim())).filter(Boolean).join(' ');
  }, CARD.id, CLAIM.transcript));

await conformance('T-X4', 'B2B2-1', 'refuses an editorial word placed where the producer never mapped it', () =>
  refuses(CARD.documentPath, d => {
    const word = d.render_timeline.words.content[0];
    const shift = 0.4;
    word.start = Math.min(word.start + shift, d.render_timeline.content_duration - 0.01);
    word.end = Math.min(word.end + shift, d.render_timeline.content_duration);
  }, CARD.id, CLAIM.transcript));

await conformance('T-X5', 'B2B2-1', 'refuses retained source words that touch none of the kept intervals', () =>
  refuses(CARD.documentPath, d => {
    d.render_timeline.words.source = [{ word: 'alpha', start: 0.2, end: 0.7, confidence: 0.9, speaker: 'S0' }];
  }, CARD.id, CLAIM.transcript));

await conformance('T-X6', 'B2B2-1', 'refuses editorial words reordered against the producer interval order', () =>
  refuses(CARD.documentPath, d => {
    const content = d.render_timeline.words.content;
    d.render_timeline.words.content = [content[content.length - 1], ...content.slice(0, -1)];
  }, CARD.id, CLAIM.transcript));

// ===========================================================================
// Historical raw media (B2B2-1)
// ===========================================================================

console.log('Historical raw media against the writer admission...');
for (const [index, hist] of HIST.entries()) {
  const timeline = hist.document.render_timeline;
  const allowance = Math.max(0.05, timeline.tolerance.composition_seconds);

  await conformance(`H-C${index + 1}`, 'B2B2-1', `reads genuine pre-composition document ${index + 1} exactly as saved`, async () => {
    const response = await context(hist.id);
    must(response.status === 200, `the genuine historical document does not read: ${j(response.body?.code)}`);
    const body = response.body;
    equal(body.revision.document.has_final_composition, false, 'has_final_composition');
    equal(body.timing.final_composition, null, 'timing.final_composition');
    must(body.diagnostics.some(d => d.code === 'DOCUMENT_PREDATES_FINAL_COMPOSITION'),
      'no DOCUMENT_PREDATES_FINAL_COMPOSITION diagnostic for a pre-composition document');
    equal(body.timing.raw_render.output_duration, timeline.output_duration, 'timing.raw_render.output_duration');
    equal(body.revision.document.recorded_probe.duration, hist.document.probe.duration, 'recorded_probe.duration');
    // The writer's own admission: before composition the served file is the raw
    // render, so its probe and the receipt's output duration describe one file.
    within(hist.document.probe.duration, timeline.output_duration, allowance,
      'the genuine record itself must satisfy the raw/probe equality');
    const expected = ORACLE[`hist-words-${index}`];
    equal(body.transcript.text, expected.content_text, 'transcript.text');
    equal((body.transcript.words ?? []).map(w => w.word), expected.content.map(w => w.word), 'transcript word sequence');
    return { version: body.revision.version, allowance };
  });

  await conformance(`H-X${index + 1}`, 'B2B2-1', `refuses a historical probe duration that contradicts the raw render (${index + 1})`, () =>
    refuses(hist.documentPath, d => { d.probe.duration = 999; }, hist.id, CLAIM.raw));
}

await conformance('H-C3', 'B2B2-1', 'keeps a probe duration inside the recorded allowance readable', () => {
  const hist = HIST[0];
  const allowance = Math.max(0.05, hist.document.render_timeline.tolerance.composition_seconds);
  return reads(hist.documentPath, d => {
    d.probe.duration = hist.document.render_timeline.output_duration + allowance * 0.5;
  }, hist.id);
});

await conformance('H-X3', 'B2B2-1', 'refuses a historical probe size that contradicts the file it describes', () =>
  refuses(HIST[0].documentPath, d => { d.probe.bytes = d.files.main.bytes + 1; }, HIST[0].id, CLAIM.raw));

await conformance('H-X4', 'B2B2-1', 'refuses a historical receipt output size that contradicts the served file record', () =>
  refuses(HIST[0].documentPath, d => { d.render_timeline.output.file_size_bytes = d.files.main.bytes + 7; }, HIST[0].id, CLAIM.raw));

// ===========================================================================
// Bookends (B2B2-1)
// ===========================================================================

console.log('Bookends against exact_render.bookend_region...');
const bookendControl = async (set, kinds) => {
  const response = await context(set.id);
  must(response.status === 200, `${set.label} does not read: ${j(response.body?.code)}`);
  const observed = {};
  for (const kind of kinds) {
    const key = `${set.label}-${kind}`;
    const expected = ORACLE[key];
    must(expected, `no producer expectation was derived for ${key}`);
    const served = response.body.revision.document.bookends[kind];
    must(served, `${kind} is missing from the response`);
    const savedCopy = set.document.render_timeline.bookends[kind];
    // The producer rounds its regions to three decimals, so a value re-derived
    // from those rounded inputs is compared inside that rounding, not exactly.
    const ROUNDING = 0.0011;
    for (const name of ['output_start', 'output_end', 'asset_duration', 'applied_overlap', 'requested_fade']) {
      if (typeof expected[name] === 'number') {
        within(served[name], expected[name], ROUNDING, `${set.label}.${kind}.${name} against the producer`);
        within(savedCopy[name], expected[name], ROUNDING, `${set.label}.${kind}.${name} in the receipt copy`);
      } else {
        equal(served[name], expected[name], `${set.label}.${kind}.${name} against the producer`);
        equal(savedCopy[name], expected[name], `${set.label}.${kind}.${name} in the receipt copy`);
      }
    }
    equal(served.branch, expected.branch, `${set.label}.${kind}.branch against the producer`);
    equal(savedCopy.branch, expected.branch, `${set.label}.${kind}.branch in the receipt copy`);
    for (const edge of ['output_start', 'output_end']) {
      within(savedCopy.transition[edge], expected.transition[edge], ROUNDING,
        `${set.label}.${kind}.transition.${edge} against the producer equation`);
    }
    equal(served.join_inputs, expected.join_inputs, `${set.label}.${kind}.join_inputs`);
    equal(served.measured_output_duration, savedCopy.measured_output_duration,
      `${set.label}.${kind}.measured_output_duration: the two stored records of one join disagree`);
    observed[kind] = { branch: served.branch, overlap: served.applied_overlap, end: served.output_end };
  }
  const other = ['intro', 'outro'].filter(k => !kinds.includes(k));
  for (const kind of other) equal(response.body.revision.document.bookends[kind], null, `${set.label}.${kind} should be absent`);
  return observed;
};

await conformance('B-C1', 'B2B2-1', 'an intro-only join matches the producer region', () => bookendControl(INTRO, ['intro']));
await conformance('B-C2', 'B2B2-1', 'an outro-only join matches the producer region', () => bookendControl(OUTRO, ['outro']));
await conformance('B-C3', 'B2B2-1', 'a recorded intro and outro pair both match the producer regions', () => bookendControl(BOTH, ['intro', 'outro']));
await conformance('B-C4', 'B2B2-1', 'the supported hard-cut fallback matches the producer regions', async () => {
  const observed = await bookendControl(HARD, ['intro', 'outro']);
  for (const kind of ['intro', 'outro']) {
    must(observed[kind].overlap === 0, `${kind} hard cut reports an overlap of ${observed[kind].overlap}`);
    must(/hardcut/.test(observed[kind].branch), `${kind} hard cut reports branch ${observed[kind].branch}`);
  }
  return observed;
});

await conformance('B-C5', 'B2B2-1', 'the last stage measurement, the next join inputs and the raw output agree', async () => {
  const response = await context(BOTH.id);
  must(response.status === 200, `the paired-bookend revision does not read: ${j(response.body?.code)}`);
  const { intro, outro } = response.body.revision.document.bookends;
  const timeline = BOTH.document.render_timeline;
  const rounding = 0.0005;
  // concat_outro probes the intro join's output and joins it again as the outro's main input.
  within(outro.join_inputs.main_duration, intro.measured_output_duration, rounding,
    'the outro join input is not the intro stage measurement');
  within(outro.measured_output_duration, timeline.output_duration,
    Math.max(0.05, timeline.tolerance.composition_seconds), 'the last stage measurement is not the raw output');
  must(Math.abs(intro.measured_output_duration - timeline.output_duration) > 0,
    'the intro stage measurement is indistinguishable from the final output, so this case proves nothing');
  return {
    intro_stage: intro.measured_output_duration, outro_join_main: outro.join_inputs.main_duration,
    outro_stage: outro.measured_output_duration, raw_output: timeline.output_duration,
  };
});

await conformance('B-C6', 'B2B2-1', 'a genuine join with no recorded join inputs stays readable and says so', () =>
  // The supported historical absence: everything else in this document is the
  // genuine record the writer produced, only the later `join_inputs` are gone.
  withMutation(BOTH.documentPath, d => {
    for (const kind of ['intro', 'outro']) {
      delete d.bookends[kind].join_inputs;
      delete d.render_timeline.bookends[kind].join_inputs;
    }
  }, async () => {
    const response = await context(BOTH.id);
    must(response.status === 200, `an old join without join inputs does not read: ${j(response.body?.code)}`);
    for (const kind of ['intro', 'outro']) {
      equal(response.body.revision.document.bookends[kind].join_inputs, null, `${kind}.join_inputs`);
      must(response.body.diagnostics.some(x => x.code === 'BOOKEND_JOIN_INPUTS_ABSENT' && x.scope.endsWith(kind)),
        `no BOOKEND_JOIN_INPUTS_ABSENT diagnostic for the ${kind}`);
    }
    return { status: 200, diagnostics: response.body.diagnostics.map(x => x.code) };
  }));

await conformance('B-X1', 'B2B2-1', 'refuses a stage measurement that its own receipt copy contradicts', () =>
  refuses(BOTH.documentPath, d => { d.bookends.outro.measured_output_duration = 999; }, BOTH.id, CLAIM.bookends));

await conformance('B-X2', 'B2B2-1', 'refuses a receipt bookend that the document copy contradicts', () =>
  refuses(BOTH.documentPath, d => { d.render_timeline.bookends.outro.output_end += 5; }, BOTH.id, CLAIM.bookends));

await conformance('B-X3', 'B2B2-1', 'refuses a transition that its own asset and overlap cannot produce', () =>
  refuses(BOTH.documentPath, d => {
    for (const record of [d.bookends.intro, d.render_timeline.bookends.intro]) {
      record.transition = { output_start: record.transition.output_start + 2, output_end: record.transition.output_end + 2 };
    }
  }, BOTH.id, CLAIM.bookends));

await conformance('B-X4', 'B2B2-1', 'refuses an outro join input that is not the intro stage measurement', () =>
  refuses(BOTH.documentPath, d => {
    for (const record of [d.bookends.outro, d.render_timeline.bookends.outro]) {
      record.join_inputs.main_duration = record.join_inputs.main_duration + 3;
    }
  }, BOTH.id, CLAIM.bookends));

await conformance('B-X5', 'B2B2-1', 'refuses an asset duration its own join inputs contradict', () =>
  refuses(BOTH.documentPath, d => {
    for (const record of [d.bookends.outro, d.render_timeline.bookends.outro]) {
      record.asset_duration = record.asset_duration + 2;
    }
  }, BOTH.id, CLAIM.bookends));

await conformance('B-C7', 'B2B2-1', 'unknown unconsumed bookend metadata stays readable', () =>
  // From the fresh review's control pair. Nothing consumes this field, so
  // rejecting it would be whole-object equality, which lead-19 rules out.
  reads(BOTH.documentPath, d => { d.bookends.outro.future_unused = { value: 1 }; }, BOTH.id));

await conformance('B-X6', 'B2B2-1', 'refuses a coherent paired last-stage measurement that the raw output contradicts', () =>
  // The fresh review's supplemental counterexample, adapted. Both stored copies
  // of the last join move together, so agreement between the copies cannot
  // catch it: only the stated last-stage-to-raw-output relationship can. The
  // raw output stays 3.929 while the published last stage claims 999.
  refuses(BOTH.documentPath, d => {
    for (const record of [d.bookends.outro, d.render_timeline.bookends.outro]) {
      record.measured_output_duration = 999;
    }
  }, BOTH.id, CLAIM.bookends));

// ===========================================================================
// Present optional artifacts (B2B2-1, lead-20 CP-2)
// ===========================================================================

console.log('Present optional artifacts against the writer that published them...');
// The writer's own placement rule: a kept sidecar holds the edited content and
// no card, and it starts where the content starts in the served file
// (clip-revisions.ts buildFinalComposition, the `sidecar` helper). The offset is
// re-derived from the card composer's measured duration and the receipt, not
// read back from the placement record this section examines.
const SIDECAR_DOMAIN = 'content-relative seconds of the edited content; it holds no card';
const overlayDocument = OVERLAY.document;
const overlayFinal = overlayDocument.final_composition;
const overlayContentOffset = overlayFinal.card.measured_duration
  + overlayDocument.render_timeline.content_to_output_offset;

await conformance('A-C1', 'B2B2-1', 'a genuinely present caption overlay and cropped source read as their own files', async () => {
  const response = await context(OVERLAY.id);
  must(response.status === 200, `the present-artifact revision does not read: ${j(response.body?.code)}`);
  LEDGERED.artifact = response.body;
  const artifacts = response.body.revision.document.artifacts;
  must(overlayContentOffset > 0,
    'the fixture offset is zero, so a placement at the content offset cannot be told from one at the start');
  await withLedger(artifactLedger, () => allOf(
    () => field('timing.final_composition.content_offset', response.body.timing.final_composition.content_offset,
      overlayContentOffset, 'the card composer measurement plus the receipt offset'),
    ...['caption_overlay', 'cropped_source'].flatMap(name => {
      const file = overlayDocument.files[name];
      const at = `revision.document.artifacts.${name}`;
      return [
        () => field(`${at}.present`, artifacts[name].present, true, `files.${name} is a published record`),
        () => field(`${at}.bytes`, artifacts[name].bytes, statSync(file.path).size,
          `the size of ${basename(file.path)} on disk`),
        () => must(file.bytes === statSync(file.path).size,
          `the published ${name} record disagrees with its own file: ${file.bytes} against ${statSync(file.path).size}`),
        () => field(`${at}.time_domain`, artifacts[name].time_domain, SIDECAR_DOMAIN,
          'the writer sidecar placement rule'),
        () => field(`${at}.contains_card`, artifacts[name].contains_card, false,
          'a kept sidecar is rendered from the content and holds no card'),
        () => nearField(`${at}.placed_at`, artifacts[name].placed_at, overlayContentOffset, 1e-9,
          'the content offset of the served file'),
      ];
    }),
    // The card this save did apply, so the present sidecars are not the only
    // placement in the response and the card-free flag means something here.
    () => field('revision.document.artifacts.card_image.present', artifacts.card_image.present, true,
      'the save applied an opening card'),
    () => field('revision.document.artifacts.card_image.bytes', artifacts.card_image.bytes,
      overlayFinal.card.image.bytes, 'the composed card image record'),
    () => field('revision.document.artifacts.card_image.sha256', artifacts.card_image.sha256,
      overlayFinal.card.image.sha256, 'the composed card image record'),
    () => field('revision.document.artifacts.card_image.placed_at', artifacts.card_image.placed_at, 0,
      'the card opens the served file'),
    () => nearField('revision.document.artifacts.card_image.until', artifacts.card_image.until,
      overlayFinal.card.measured_duration, 1e-9, 'the measured card duration'),
    () => field('revision.document.recipe.keep_caption_overlay',
      response.body.revision.document.recipe.keep_caption_overlay, true, 'the saved recipe'),
  ));
  return {
    content_offset: overlayContentOffset,
    caption_overlay: artifacts.caption_overlay, cropped_source: artifacts.cropped_source,
  };
});

await conformance('A-X1', 'B2B2-1', 'refuses a present caption overlay relabelled with the served file domain', () =>
  refuses(OVERLAY.documentPath, d => {
    d.final_composition.artifacts.caption_overlay.time_domain = d.final_composition.artifacts.main.time_domain;
  }, OVERLAY.id, CLAIM.artifacts));

await conformance('A-X2', 'B2B2-1', 'refuses a present cropped source that claims to contain the card', () =>
  refuses(OVERLAY.documentPath, d => {
    d.final_composition.artifacts.cropped_source.contains_card = true;
  }, OVERLAY.id, CLAIM.artifacts));

await conformance('A-X3', 'B2B2-1', 'refuses a present caption overlay placed at the card instead of the content', () =>
  refuses(OVERLAY.documentPath, d => {
    d.final_composition.artifacts.caption_overlay.placed_at = 0;
  }, OVERLAY.id, CLAIM.artifacts));

await conformance('A-X4', 'B2B2-1', 'refuses a present placement that names the other recorded artifact file', () =>
  // Both files and both placements exist; only their identities are swapped, so
  // a refusal cannot be credited to a dangling record or a missing file.
  refuses(OVERLAY.documentPath, d => {
    d.final_composition.artifacts.caption_overlay.path = d.files.cropped_source.path;
  }, OVERLAY.id, CLAIM.artifacts));

await conformance('A-X5', 'B2B2-1', 'publishes the optional-artifact size the saved document records, not the current file', () => {
  // A recorded-metadata projection control (lead-21, correcting CPR-1/WS-19).
  //
  // `revision.document.artifacts` is the optional-artifact subtree the save
  // *recorded* beside the served file (models/clip-editor-context.ts, the
  // `artifacts` field), projected field for field by `projectDocument`.
  // `media.output` is the separate live contract, and it is the one that carries
  // stat-derived `bytes` beside `recorded_bytes` and `size_matches`. Nothing the
  // project has settled makes the recorded subtree track current disk state, so
  // this case asserts the projection it is, not a live-file guarantee: the
  // expected value is the mutated document's own field, and the size on disk is
  // recorded beside it as an observation that the two are different facts.
  //
  // A-C1 separately proves that a genuine untouched save agrees with its files.
  //
  // Deliberately outside every coverage ledger: this comparison is made against
  // a mutated document, and the leaf it reads is already credited at equality
  // strength by A-C1 against the unmutated present-artifact response that C-R3
  // audits. Crediting it from here would repeat the CP-1 accounting error.
  let recordedBytes = null;
  return withMutation(OVERLAY.documentPath, d => {
    recordedBytes = d.files.caption_overlay.bytes + 1;
    d.files.caption_overlay.bytes = recordedBytes;
  }, async () => {
    const response = await context(OVERLAY.id);
    must(response.status === 200,
      `an otherwise coherent document with a changed recorded artifact size did not read: ${response.status} ${j(response.body?.code)}`);
    const published = response.body.revision.document.artifacts.caption_overlay.bytes;
    equal(published, recordedBytes, 'revision.document.artifacts.caption_overlay.bytes');
    // Observation only, asserted against nothing: the live size the recorded
    // value now deliberately differs from.
    const onDiskObservation = statSync(overlayDocument.files.caption_overlay.path).size;
    return {
      status: 200,
      expected_source: 'the mutated document files.caption_overlay.bytes record',
      recorded_bytes: recordedBytes, published,
      observed_current_file_bytes: onDiskObservation,
      observation_note: 'recorded metadata, not a live-file claim; media.output carries the live size separately',
    };
  });
});

// ===========================================================================
// Resolved-file serving eligibility (B2B2-3)
// ===========================================================================

console.log('Committed-media claims against what the routes actually serve...');
const servingCase = async (id, acceptance, title, clipId, expectation, prepare = null) =>
  conformance(id, acceptance, title, async entry => {
    const restore = prepare ? prepare() : null;
    try {
      return await servingBody(entry, clipId, expectation);
    } finally {
      if (restore) restore();
    }
  });
async function servingBody(entry, clipId, expectation) {
  {
    const [response, served] = [await context(clipId), await servedBy(clipId)];
    must(response.status === 200, `the clip does not read: ${response.status} ${j(response.body?.code)}`);
    const byId = Object.fromEntries(response.body.capabilities.map(c => [c.id, c]));
    const observed = {
      route_preview: served.preview.status, route_download: served.download.status,
      served_kind: response.body.media.summary.served_kind,
      summary_state: response.body.media.summary.state,
      play: byId.play_committed_media.available, reason: byId.play_committed_media.reason,
      download: byId.download_committed_media.available,
      output_state: response.body.media.output.state,
    };
    // Recorded before anything is asserted, so a failing row keeps its observation.
    entry.observed = observed;
    const routeServes = served.preview.status === 200 || served.preview.status === 206;
    equal(observed.route_preview, expectation.route, 'the existing preview route status');
    // The honesty requirement in both directions: a capability is a claim about
    // what these urls do, so it must agree with what they actually did.
    must(observed.play === routeServes,
      `play_committed_media is ${observed.play} but the preview route answered ${observed.route_preview}`);
    must(observed.download === routeServes,
      `download_committed_media is ${observed.download} but the download route answered ${observed.route_download}`);
    if (expectation.servedKind) equal(observed.served_kind, expectation.servedKind, 'media.summary.served_kind');
    if (expectation.serves === null) equal(response.body.media.serves, null, 'media.serves');
    if (expectation.serves === 'revision') must(response.body.media.serves !== null, 'media.serves is null for a served revision');
    if (expectation.reason) equal(byId.play_committed_media.reason, expectation.reason, 'the committed-media reason');
    return observed;
  }
}

/** Run one body with the clip list mutated, then restore its bytes. */
const historyMutation = mutate => {
  const original = readFileSync(historyPath);
  const list = JSON.parse(original.toString('utf8'));
  mutate(list);
  writeFileSync(historyPath, JSON.stringify(list, null, 2));
  return () => writeFileSync(historyPath, original);
};

await servingCase('S-C1', 'B2B2-3', 'an ordinary supported file is claimed exactly as the route serves it',
  SERVE.plainMp4, { route: 200, servedKind: 'supported' });
await servingCase('S-C2', 'B2B2-3', 'an ordinary unsupported container is refused by both',
  SERVE.plainAvi, { route: 400, servedKind: 'unsupported' });
await servingCase('S-C3', 'B2B2-3', 'a directory wearing a media extension is refused by both',
  SERVE.folder, { route: 400 });
await servingCase('S-X3', 'B2B2-3', 'a dangling link claims nothing',
  SERVE.dangling, { route: 404 });
await servingCase('S-X1', 'B2B2-3', 'a supported name over an unsupported resolved file claims nothing',
  SERVE.linkToAvi, { route: 400, servedKind: 'unsupported' });
await servingCase('S-X2', 'B2B2-3', 'an unsupported name over a supported resolved file is claimed',
  SERVE.linkToMp4, { route: 200, servedKind: 'supported' });
await servingCase('S-C4', 'B2B2-3', 'a tracked revision whose summary is its own file is claimed and served',
  CARD.id, { route: 200, servedKind: 'supported', serves: 'revision' });
await servingCase('S-C6', 'B2B2-3', 'a tracked clip with no output summary claims nothing',
  CARD.id, { route: 404, serves: null, reason: 'COMMITTED_MEDIA_SUMMARY_DRIFT' },
  () => historyMutation(list => { delete list.find(e => e.id === CARD.id).output_path; }));
await servingCase('S-C7', 'B2B2-3', 'a tracked clip with an unusable output summary claims nothing',
  CARD.id, { route: 404, serves: null, reason: 'COMMITTED_MEDIA_SUMMARY_DRIFT' },
  () => historyMutation(list => { list.find(e => e.id === CARD.id).output_path = 42; }));

await conformance('S-C5', 'B2B2-3', 'a tracked summary naming another file disowns the urls without losing context', async () => {
  const before = readFileSync(historyPath);
  const list = JSON.parse(before.toString('utf8'));
  list.find(e => e.id === CARD.id).output_path = media('plain.mp4');
  writeFileSync(historyPath, JSON.stringify(list, null, 2));
  try {
    const response = await context(CARD.id);
    const served = await servedBy(CARD.id);
    must(response.status === 200, `the drifted clip does not read: ${j(response.body?.code)}`);
    const byId = Object.fromEntries(response.body.capabilities.map(c => [c.id, c]));
    equal(response.body.media.serves, null, 'media.serves for a drifted summary');
    equal(byId.play_committed_media.available, false, 'play_committed_media for a drifted summary');
    equal(byId.play_committed_media.reason, 'COMMITTED_MEDIA_SUMMARY_DRIFT', 'the drift reason');
    equal(byId.edit_writing_metadata.available, true, 'writing stays editable');
    equal(response.body.timing.effective_cuts_known, true, 'the revision timing stays described');
    must(response.body.diagnostics.some(d => d.code === 'COMMITTED_MEDIA_SUMMARY_DRIFT'), 'no drift diagnostic');
    return { route_preview: served.preview.status, serves: null };
  } finally {
    writeFileSync(historyPath, before);
  }
});

// ===========================================================================
// Remaining projections (B2B2-1, B2B2-2, B2B2-4)
// ===========================================================================

console.log('Projection ledger over the control response...');
const cardDocument = CARD.document;
const cardEntry = entryOf(CARD.id);
const cardState = CARD.state;
const cardPointer = cardState.current;
const cardFinal = cardDocument.final_composition;
const baseName = p => (typeof p === 'string' && p ? basename(p) : null);
const textOrNull = v => (typeof v === 'string' && v ? v : null);
const numberOrNull = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const boolOrNull = v => (typeof v === 'boolean' ? v : null);
const expectedRecipe = r => ({
  source_name: baseName(r.source_video), title: r.title, caption_style: r.caption_style,
  caption_position: textOrNull(r.caption_position), caption_font_scale: numberOrNull(r.caption_font_scale),
  clean_fillers: boolOrNull(r.clean_fillers), crop_strategy: r.crop_strategy,
  crop_keyframes: Array.isArray(r.crop_keyframes) ? r.crop_keyframes.map(k => ({ t: k.t, x_pct: k.x_pct })) : null,
  crop_keyframe_domain: Array.isArray(r.crop_keyframes) ? 'content' : null,
  has_foreground_framing: !!r.foreground_framing, format: r.format,
  logo: { selected: !!textOrNull(r.logo_path), name: baseName(r.logo_path), position: textOrNull(r.logo_position) },
  intro: { selected: !!textOrNull(r.intro_path), name: baseName(r.intro_path) },
  outro: { selected: !!textOrNull(r.outro_path), name: baseName(r.outro_path) },
  bookend_fade: numberOrNull(r.bookend_fade), keep_caption_overlay: boolOrNull(r.keep_caption_overlay),
  allow_ass_fallback: boolOrNull(r.allow_ass_fallback),
});

await conformance('P-C1', 'B2B2-1', 'identity, clip text and operations project the stored records', () => {
  field('version', CONTROL.version, 1, 'EDITOR_CONTEXT_VERSION in the published contract');
  patterned('identity.captured_at', CONTROL.identity.captured_at, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/,
    'an ISO instant; the capture time itself has no external expected value');
  field('identity.clip_id', CONTROL.identity.clip_id, CARD.id);
  field('identity.tracked', CONTROL.identity.tracked, true);
  field('identity.incarnation', CONTROL.identity.incarnation, cardState.incarnation);
  field('identity.revision_version', CONTROL.identity.revision_version, cardState.revision_version);
  field('identity.draft_version', CONTROL.identity.draft_version, cardState.draft_version);
  prose('identity.note', CONTROL.identity.note);

  field('clip.title', CONTROL.clip.title, cardEntry.title);
  field('clip.created_at', CONTROL.clip.created_at, textOrNull(cardEntry.created_at));
  field('clip.content_type', CONTROL.clip.content_type, textOrNull(cardEntry.content_type));
  field('clip.format', CONTROL.clip.format, cardEntry.format);
  field('clip.caption_style', CONTROL.clip.caption_style, textOrNull(cardEntry.caption_style));
  field('clip.crop_strategy', CONTROL.clip.crop_strategy, textOrNull(cardEntry.crop_strategy));
  field('clip.recorded_duration', CONTROL.clip.recorded_duration, numberOrNull(cardEntry.duration));
  field('clip.recorded_size_mb', CONTROL.clip.recorded_size_mb, numberOrNull(cardEntry.file_size_mb));
  field('clip.source_name', CONTROL.clip.source_name, baseName(cardEntry.source_video));
  field('clip.output_name', CONTROL.clip.output_name, baseName(cardEntry.output_path));
  field('clip.transcript_slice', CONTROL.clip.transcript_slice, textOrNull(cardEntry.transcript_slice));
  field('clip.publishing.generated_titles', CONTROL.clip.publishing.generated_titles,
    Array.isArray(cardEntry.generated_titles) ? cardEntry.generated_titles : null);
  field('clip.publishing.description', CONTROL.clip.publishing.description, textOrNull(cardEntry.description));
  field('clip.publishing.tags', CONTROL.clip.publishing.tags, textOrNull(cardEntry.tags));
  field('clip.publishing.hashtags', CONTROL.clip.publishing.hashtags, textOrNull(cardEntry.hashtags));
  field('clip.publishing.youtube_video_id', CONTROL.clip.publishing.youtube_video_id, textOrNull(cardEntry.youtube_video_id));

  const ops = cardState.operations ?? [];
  const byState = { pending: 0, committed: 0, failed: 0, cancelled: 0, superseded: 0 };
  for (const op of ops) byState[op.state]++;
  field('operations.total', CONTROL.operations.total, ops.length);
  field('operations.by_state', CONTROL.operations.by_state, byState);
  field('operations.pending', CONTROL.operations.pending, null);
  const last = ops[ops.length - 1];
  field('operations.latest', CONTROL.operations.latest, last
    ? { operation_id: last.operation_id, state: last.state, started_at: last.started_at, ended_at: last.ended_at, has_error: !!last.error }
    : null);
  prose('operations.note', CONTROL.operations.note);
  field('legacy', CONTROL.legacy, null);
  return { operations: ops.length };
});

await conformance('P-C2', 'B2B2-1', 'the revision, its recipe, card, artifacts and probe project the document', () => {
  field('revision.revision_id', CONTROL.revision.revision_id, cardPointer.revision_id);
  field('revision.version', CONTROL.revision.version, cardPointer.version);
  field('revision.provenance', CONTROL.revision.provenance, 'exact');
  field('revision.committed_at', CONTROL.revision.committed_at, cardPointer.committed_at);
  field('revision.operation_id', CONTROL.revision.operation_id, cardPointer.operation_id);
  const doc = CONTROL.revision.document;
  field('revision.document.schema', doc.schema, cardDocument.schema);
  field('revision.document.created_at', doc.created_at, cardDocument.created_at);
  field('revision.document.operation_id', doc.operation_id, cardDocument.operation_id);
  field('revision.document.words_input', doc.words_input, cardDocument.words_input);
  field('revision.document.recipe', doc.recipe, expectedRecipe(cardDocument.recipe));
  field('revision.document.has_final_composition', doc.has_final_composition, !!cardFinal);
  field('revision.document.bookends', doc.bookends, { intro: null, outro: null });
  field('revision.document.recorded_probe', doc.recorded_probe, {
    duration: cardDocument.probe.duration, bytes: cardDocument.probe.bytes,
    has_video: cardDocument.probe.has_video, has_audio: cardDocument.probe.has_audio,
  });
  field('revision.document.thumbnail_card.requested', doc.thumbnail_card.requested, cardDocument.thumbnail_card.requested);
  field('revision.document.thumbnail_card.applied', doc.thumbnail_card.applied, cardDocument.thumbnail_card.applied);
  field('revision.document.thumbnail_card.image', doc.thumbnail_card.image, {
    sha256: cardDocument.thumbnail_card.image.sha256, bytes: cardDocument.thumbnail_card.image.bytes,
    name: baseName(cardDocument.thumbnail_card.image.path),
  });
  prose('revision.document.thumbnail_card.note', doc.thumbnail_card.note);
  const artifactOf = (file, placement) => ({
    present: !!file, bytes: file ? file.bytes : null,
    time_domain: placement ? placement.time_domain : null,
    contains_card: placement ? placement.contains_card : null,
    placed_at: placement ? placement.placed_at : null,
  });
  field('revision.document.artifacts.caption_overlay', doc.artifacts.caption_overlay,
    artifactOf(cardDocument.files.caption_overlay, cardFinal?.artifacts?.caption_overlay ?? null));
  field('revision.document.artifacts.cropped_source', doc.artifacts.cropped_source,
    artifactOf(cardDocument.files.cropped_source, cardFinal?.artifacts?.cropped_source ?? null));
  field('revision.document.artifacts.card_image', doc.artifacts.card_image, {
    present: !!cardFinal?.card, bytes: cardFinal?.card ? cardFinal.card.image.bytes : null,
    sha256: cardFinal?.card ? cardFinal.card.image.sha256 : null,
    placed_at: cardFinal?.artifacts?.card_image ? cardFinal.artifacts.card_image.placed_at : null,
    until: cardFinal?.artifacts?.card_image ? cardFinal.artifacts.card_image.until : null,
  });
  field('revision.document.dependency_group_count', doc.dependency_group_count,
    Array.isArray(cardPointer.groups) ? cardPointer.groups.length : cardPointer.group_root ? 1 : 0);
  return { groups: doc.dependency_group_count };
});

await conformance('P-C3', 'B2B2-1', 'the timing section projects the receipt and the composition it belongs to', () => {
  const timeline = cardDocument.render_timeline;
  field('timing.provenance', CONTROL.timing.provenance, 'exact-revision');
  field('timing.effective_cuts_known', CONTROL.timing.effective_cuts_known, true);
  field('timing.effective_segments', CONTROL.timing.effective_segments,
    timeline.segments.map(s => ({
      index: s.index, source_start: s.source_start, source_end: s.source_end,
      content_start: s.content_start, content_end: s.content_end, duration: s.duration,
    })));
  // The renderer's own map must also be the producer's map of the same request.
  equal(CONTROL.timing.effective_segments, ORACLE['card-words'].content_intervals,
    'the effective segments are not the producer intervals of the kept request');
  field('timing.requested_range', CONTROL.timing.requested_range,
    Number.isFinite(cardEntry.start_second) && Number.isFinite(cardEntry.end_second)
      ? { start_second: cardEntry.start_second, end_second: cardEntry.end_second, label: 'requested' } : null);
  field('timing.requested_keep_segments', CONTROL.timing.requested_keep_segments, null);
  field('timing.raw_render', CONTROL.timing.raw_render, {
    content_duration: timeline.content_duration, content_duration_measured: timeline.content_duration_measured,
    content_to_output_offset: timeline.content_to_output_offset, output_duration: timeline.output_duration,
  });
  field('timing.final_composition', CONTROL.timing.final_composition, cardFinal ? {
    card_offset: cardFinal.card_offset, content_offset: cardFinal.content_offset,
    content_duration: cardFinal.content_duration, output_duration: cardFinal.output.duration,
  } : null);
  field('timing.frame_precision', CONTROL.timing.frame_precision, {
    source_variable_frame_rate: timeline.frame_precision.source_variable_frame_rate,
    note: timeline.frame_precision.note,
  });
  field('timing.time_domains', CONTROL.timing.time_domains, [
    { scope: 'render_timeline', map: timeline.time_domains },
    ...(cardFinal?.time_domains ? [{ scope: 'final_composition', map: cardFinal.time_domains }] : []),
  ]);
  equal(timeline.content_duration, ORACLE['card-words'].content_duration,
    'the receipt content duration is not the producer content duration of the kept request');
  return { segments: CONTROL.timing.effective_segments.length };
});

await conformance('P-C4', 'B2B2-1', 'media, summary and draft project their own records', () => {
  const main = cardDocument.files.main;
  field('media.output.name', CONTROL.media.output.name, baseName(main.path));
  field('media.output.state', CONTROL.media.output.state, 'available');
  field('media.output.bytes', CONTROL.media.output.bytes, statSync(main.path).size);
  field('media.output.recorded_bytes', CONTROL.media.output.recorded_bytes, main.bytes);
  field('media.output.size_matches', CONTROL.media.output.size_matches, statSync(main.path).size === main.bytes);
  field('media.output.integrity_verified', CONTROL.media.output.integrity_verified, false);
  field('media.output.detail', CONTROL.media.output.detail, null);
  field('media.source.name', CONTROL.media.source.name, baseName(cardDocument.recipe.source_video));
  field('media.source.state', CONTROL.media.source.state, 'available');
  field('media.source.bytes', CONTROL.media.source.bytes, statSync(cardDocument.recipe.source_video).size);
  field('media.source.recorded_bytes', CONTROL.media.source.recorded_bytes, null);
  field('media.source.size_matches', CONTROL.media.source.size_matches, null);
  field('media.source.integrity_verified', CONTROL.media.source.integrity_verified, false);
  field('media.source.detail', CONTROL.media.source.detail, null);
  field('media.summary.state', CONTROL.media.summary.state, 'equal');
  field('media.summary.served_kind', CONTROL.media.summary.served_kind, 'supported');
  prose('media.summary.detail', CONTROL.media.summary.detail);
  field('media.urls.preview', CONTROL.media.urls.preview, `/api/clips/${encodeURIComponent(CARD.id)}/preview`);
  field('media.urls.download', CONTROL.media.urls.download, `/api/clips/${encodeURIComponent(CARD.id)}/download`);
  prose('media.urls.note', CONTROL.media.urls.note);
  field('media.serves', CONTROL.media.serves,
    { revision_id: cardPointer.revision_id, version: cardPointer.version, provenance: cardPointer.provenance });

  const draftDoc = CARD.draftDocument;
  field('draft.version', CONTROL.draft.version, cardState.draft.version);
  field('draft.saved_at', CONTROL.draft.saved_at, cardState.draft.saved_at);
  field('draft.recipe', CONTROL.draft.recipe, expectedRecipe(draftDoc.draft.recipe));
  field('draft.thumbnail_card', CONTROL.draft.thumbnail_card, {
    selected: !!draftDoc.draft.thumbnail_card,
    image_sha256: draftDoc.draft.thumbnail_card ? draftDoc.draft.thumbnail_card.image_sha256 : null,
    image_name: draftDoc.draft.thumbnail_card ? baseName(draftDoc.draft.thumbnail_card.image_path) : null,
  });
  field('draft.words_input', CONTROL.draft.words_input, Array.isArray(draftDoc.draft.source_words) ? 'supplied' : 'unavailable');
  field('draft.source_word_count', CONTROL.draft.source_word_count,
    Array.isArray(draftDoc.draft.source_words) ? draftDoc.draft.source_words.length : null);
  field('draft.note', CONTROL.draft.note, textOrNull(draftDoc.draft.note));
  return { draft_version: CONTROL.draft.version };
});

await conformance('P-C5', 'B2B2-1', 'every capability and diagnostic leaf is a claim this response can support', () => {
  marker('capabilities', 'the array itself; each row is compared leaf by leaf below');
  // Each row's `available` has an external expected value. A `reason` is compared
  // exactly only where an independent source names it; otherwise it is held to
  // the published enumeration and to the rule that only an available capability
  // may report AVAILABLE. The difference is recorded per leaf.
  capabilityLedger(CONTROL.capabilities, {
    // S-C4 proved these two against what /preview and /download actually did.
    play_committed_media: { available: true, reason: 'AVAILABLE', source: 'the preview route served this clip in S-C4' },
    download_committed_media: { available: true, reason: 'AVAILABLE', source: 'the download route served this clip in S-C4' },
    edit_writing_metadata: {
      available: true, reason: 'AVAILABLE',
      source: 'spec AC-10: writing stays usable whenever the clip reads',
    },
    known_effective_cuts: {
      available: CONTROL.timing.effective_cuts_known, reason: 'AVAILABLE',
      source: 'timing.effective_cuts_known, itself compared with the saved receipt in P-C3',
    },
    widen_from_source_words: {
      available: CONTROL.transcript.widening_input.available, reason: CONTROL.transcript.widening_input.reason,
      source: 'transcript.widening_input, itself compared with the Python producer in T-C1',
    },
    reopen_source_media: {
      available: existsSync(cardDocument.recipe.source_video), reason: 'AVAILABLE',
      source: 'the source file is on disk',
    },
    save_revision: {
      available: false, reason: 'WRITE_ROUTE_NOT_AVAILABLE',
      source: 'spec B2B2-4: this slice adds no write route',
    },
    // No external source names this code, so only the enumeration and the
    // available/reason consistency rule are asserted; the observed value is
    // recorded below for the reviewer rather than guessed at here.
    adopt_for_revision_tracking: { available: false, source: 'spec B2B2-4: adoption is never offered' },
  });
  marker('diagnostics', 'the array itself; each row is compared leaf by leaf below');
  // Nothing about this fixture is anomalous: a healthy card revision whose
  // media, source and summary all agree has nothing to report.
  diagnosticLedger(CONTROL.diagnostics, []);
  return {
    capabilities: CONTROL.capabilities.length,
    diagnostics: CONTROL.diagnostics.map(d => d.code),
    reasons: Object.fromEntries(CONTROL.capabilities.map(c => [c.id, c.reason])),
  };
});

await conformance('P-C6', 'B2B2-2', 'a legacy clip keeps its stored intervals labelled requested', async () => {
  const response = await context(SERVE.plainMp4);
  must(response.status === 200, `the legacy clip does not read: ${j(response.body?.code)}`);
  const body = response.body;
  equal(body.timing.provenance, 'legacy-entry', 'timing.provenance');
  equal(body.timing.effective_cuts_known, false, 'effective_cuts_known');
  equal(body.timing.effective_segments, null, 'effective_segments');
  equal(body.timing.requested_keep_segments.label, 'requested', 'the keep-segment label');
  equal(body.timing.requested_keep_segments.segments, [{ start: 1, end: 2 }, { start: 4, end: 5 }], 'the stored intervals');
  equal(body.timing.requested_range, { start_second: 1, end_second: 5, label: 'requested' }, 'the stored range');
  must(body.diagnostics.some(d => d.code === 'LEGACY_TIMING_UNPROVEN'), 'no LEGACY_TIMING_UNPROVEN diagnostic');
  equal(body.revision, null, 'revision for an untracked clip');
  return { provenance: 'legacy-entry' };
});

await conformance('P-C10', 'B2B2-2', 'every leaf of a legacy clip response projects its own stored inputs', async () => {
  const response = await context(RICH);
  must(response.status === 200, `the legacy recovery clip does not read: ${j(response.body?.code)}`);
  const body = response.body;
  const entry = entryOf(RICH);
  LEDGERED.legacy = body;
  return withLedger(legacyLedger, async () => {
    // The reader's own display convention for a conflicting value, restated here
    // rather than imported, so the comparison does not come from the code under test.
    const describe = value => {
      if (value === undefined) return 'absent';
      if (value === null) return 'null';
      if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 117)}...` : value;
      const text = JSON.stringify(value) ?? String(value);
      return text.length > 300 ? `${text.slice(0, 297)}...` : text;
    };
    field('version', body.version, 1, 'EDITOR_CONTEXT_VERSION in the published contract');
    patterned('identity.captured_at', body.identity.captured_at, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/,
      'an ISO instant; the capture time itself has no external expected value');
    field('identity.clip_id', body.identity.clip_id, RICH);
    field('identity.tracked', body.identity.tracked, false);
    field('identity.incarnation', body.identity.incarnation, null);
    field('identity.revision_version', body.identity.revision_version, null);
    field('identity.draft_version', body.identity.draft_version, null);
    prose('identity.note', body.identity.note);
    field('clip.title', body.clip.title, entry.title);
    field('clip.created_at', body.clip.created_at, textOrNull(entry.created_at));
    field('clip.content_type', body.clip.content_type, textOrNull(entry.content_type));
    field('clip.format', body.clip.format, entry.format);
    field('clip.caption_style', body.clip.caption_style, textOrNull(entry.caption_style));
    field('clip.crop_strategy', body.clip.crop_strategy, textOrNull(entry.crop_strategy));
    field('clip.recorded_duration', body.clip.recorded_duration, numberOrNull(entry.duration));
    field('clip.recorded_size_mb', body.clip.recorded_size_mb, numberOrNull(entry.file_size_mb));
    field('clip.source_name', body.clip.source_name, baseName(entry.source_video));
    field('clip.output_name', body.clip.output_name, baseName(entry.output_path));
    field('clip.transcript_slice', body.clip.transcript_slice, textOrNull(entry.transcript_slice));
    field('clip.publishing.generated_titles', body.clip.publishing.generated_titles, null);
    field('clip.publishing.description', body.clip.publishing.description, textOrNull(entry.description));
    field('clip.publishing.tags', body.clip.publishing.tags, textOrNull(entry.tags));
    field('clip.publishing.hashtags', body.clip.publishing.hashtags, textOrNull(entry.hashtags));
    field('clip.publishing.youtube_video_id', body.clip.publishing.youtube_video_id, textOrNull(entry.youtube_video_id));

    field('media.output.name', body.media.output.name, baseName(entry.output_path));
    field('media.output.state', body.media.output.state, 'available');
    field('media.output.bytes', body.media.output.bytes, statSync(entry.output_path).size);
    field('media.output.recorded_bytes', body.media.output.recorded_bytes, null);
    field('media.output.size_matches', body.media.output.size_matches, null);
    field('media.output.integrity_verified', body.media.output.integrity_verified, false);
    field('media.output.detail', body.media.output.detail, null);
    field('media.source.name', body.media.source.name, baseName(entry.source_video));
    field('media.source.state', body.media.source.state, 'available');
    field('media.source.bytes', body.media.source.bytes, statSync(entry.source_video).size);
    field('media.source.recorded_bytes', body.media.source.recorded_bytes, null);
    field('media.source.size_matches', body.media.source.size_matches, null);
    field('media.source.integrity_verified', body.media.source.integrity_verified, false);
    field('media.source.detail', body.media.source.detail, null);
    field('media.summary.state', body.media.summary.state, 'untracked');
    field('media.summary.served_kind', body.media.summary.served_kind, 'supported');
    prose('media.summary.detail', body.media.summary.detail);
    field('media.urls.preview', body.media.urls.preview, `/api/clips/${encodeURIComponent(RICH)}/preview`);
    field('media.urls.download', body.media.urls.download, `/api/clips/${encodeURIComponent(RICH)}/download`);
    prose('media.urls.note', body.media.urls.note);
    field('media.serves', body.media.serves, null);
    field('revision', body.revision, null);
    field('draft', body.draft, null);
    field('operations.total', body.operations.total, 0);
    field('operations.by_state', body.operations.by_state,
      { pending: 0, committed: 0, failed: 0, cancelled: 0, superseded: 0 });
    field('operations.pending', body.operations.pending, null);
    field('operations.latest', body.operations.latest, null);
    prose('operations.note', body.operations.note);

    field('timing.provenance', body.timing.provenance, 'legacy-entry');
    field('timing.effective_cuts_known', body.timing.effective_cuts_known, false);
    field('timing.effective_segments', body.timing.effective_segments, null);
    field('timing.requested_range', body.timing.requested_range,
      { start_second: entry.start_second, end_second: entry.end_second, label: 'requested' });
    field('timing.requested_keep_segments', body.timing.requested_keep_segments,
      { segments: entry.keep_segments, label: 'requested', sources: ['history-entry', 'legacy-recipe'] });
    field('timing.raw_render', body.timing.raw_render, null);
    field('timing.final_composition', body.timing.final_composition, null);
    field('timing.frame_precision', body.timing.frame_precision, null);
    field('timing.time_domains', body.timing.time_domains, []);

    field('transcript.availability', body.transcript.availability, 'available');
    field('transcript.provenance', body.transcript.provenance, 'legacy-words-sidecar');
    field('transcript.domain', body.transcript.domain, 'source-absolute');
    field('transcript.words', body.transcript.words, BOUNDED);
    field('transcript.word_count', body.transcript.word_count, BOUNDED.length);
    field('transcript.text', body.transcript.text, textOrNull(entry.transcript_slice));
    field('transcript.widening_input', body.transcript.widening_input,
      { available: false, reason: 'TRANSCRIPT_BOUNDED_ONLY', word_count: null });
    prose('transcript.detail', body.transcript.detail);

    field('legacy.reason', body.legacy.reason, 'untracked');
    for (const name of ['words', 'recipe', 'reframe']) {
      field(`legacy.sidecars.${name}`, body.legacy.sidecars[name], { state: 'present', detail: null });
    }
    field('legacy.recipe', body.legacy.recipe, {
      caption_style: LEGACY_RECIPE.caption_style, caption_position: null, caption_font_scale: null,
      crop_strategy: LEGACY_RECIPE.crop_strategy, format: LEGACY_RECIPE.format,
      clean_fillers: LEGACY_RECIPE.clean_fillers,
      logo: { selected: false, name: null, position: null },
      intro: { selected: false, name: null }, outro: { selected: false, name: null },
      has_foreground_framing: false, requested_keep_segments: LEGACY_RECIPE.keep_segments,
      transcript_word_count: LEGACY_RECIPE.transcript_words.length,
    });
    field('legacy.reframe', body.legacy.reframe,
      { in_second: LEGACY_REFRAME.inSec, out_second: LEGACY_REFRAME.outSec, keyframe_count: LEGACY_REFRAME.keyframes.length });
    field('legacy.thumbnail.selected', body.legacy.thumbnail.selected, true);
    field('legacy.thumbnail.state', body.legacy.thumbnail.state, 'available');
    field('legacy.thumbnail.card_seconds', body.legacy.thumbnail.card_seconds, entry.thumbnail_config.card_seconds);
    field('legacy.thumbnail.baked_provenance', body.legacy.thumbnail.baked_provenance, 'unknown');
    prose('legacy.thumbnail.detail', body.legacy.thumbnail.detail);
    // The entry and its sidecars disagree about exactly these four fields. Each
    // row is compared leaf by leaf: a mapped projection of the array would let a
    // newly added property through, so the array itself is only marked.
    const expectedConflicts = [
      { code: 'LEGACY_FIELD_CONFLICT', field: 'caption_style', values: [
        { source: 'history-entry', value: describe(entry.caption_style) },
        { source: 'legacy-recipe', value: describe(LEGACY_RECIPE.caption_style) }] },
      { code: 'LEGACY_FIELD_CONFLICT', field: 'format', values: [
        { source: 'history-entry', value: describe(entry.format) },
        { source: 'legacy-recipe', value: describe(LEGACY_RECIPE.format) }] },
      { code: 'LEGACY_FIELD_CONFLICT', field: 'requested_keep_segments', values: [
        { source: 'history-entry', value: describe(entry.keep_segments) },
        { source: 'legacy-recipe', value: describe(LEGACY_RECIPE.keep_segments) }] },
      { code: 'LEGACY_FIELD_CONFLICT', field: 'start_second', values: [
        { source: 'history-entry', value: describe(entry.start_second) },
        { source: 'legacy-reframe', value: describe(LEGACY_REFRAME.inSec) }] },
    ];
    marker('legacy.conflicts', 'the array itself; each row is compared leaf by leaf below');
    equal(body.legacy.conflicts.length, expectedConflicts.length, 'the number of legacy field conflicts');
    expectedConflicts.forEach((want, index) => {
      const got = body.legacy.conflicts[index] ?? {};
      field(`legacy.conflicts[${index}].code`, got.code, want.code);
      field(`legacy.conflicts[${index}].field`, got.field, want.field);
      field(`legacy.conflicts[${index}].values`, got.values, want.values);
      prose(`legacy.conflicts[${index}].detail`, got.detail);
    });
    field('legacy.recovery.effective_cuts_known', body.legacy.recovery.effective_cuts_known, false);
    field('legacy.recovery.reason', body.legacy.recovery.reason, 'LEGACY_TIMING_UNPROVEN');
    marker('legacy.recovery.needs', 'the list itself; each entry is checked below');
    must(Array.isArray(body.legacy.recovery.needs) && body.legacy.recovery.needs.length >= 2,
      'the recovery needs list does not name what is missing');
    body.legacy.recovery.needs.forEach((need, index) => prose(`legacy.recovery.needs[${index}]`, need));

    marker('capabilities', 'the array itself; each row is compared leaf by leaf below');
    const routeServes = (await servedBy(RICH)).preview.status === 200;
    capabilityLedger(body.capabilities, {
      play_committed_media: {
        available: routeServes, reason: routeServes ? 'AVAILABLE' : undefined,
        source: 'what the preview route answered for this clip in this run',
      },
      download_committed_media: {
        available: routeServes, reason: routeServes ? 'AVAILABLE' : undefined,
        source: 'what the download route answered for this clip in this run',
      },
      edit_writing_metadata: {
        available: true, reason: 'AVAILABLE',
        source: 'spec AC-10: writing stays usable for a legacy clip too',
      },
      known_effective_cuts: {
        available: false, reason: body.legacy.recovery.reason,
        source: 'a legacy entry records a requested range, not the cuts the renderer made',
        reasonSource: 'legacy.recovery.reason, compared independently above',
      },
      widen_from_source_words: {
        available: false, reason: body.transcript.widening_input.reason,
        source: 'only bounded words were stored beside this clip',
        reasonSource: 'transcript.widening_input.reason, compared independently above',
      },
      reopen_source_media: {
        available: existsSync(entry.source_video), reason: 'AVAILABLE',
        source: 'the source file is on disk',
      },
      save_revision: {
        available: false, reason: 'WRITE_ROUTE_NOT_AVAILABLE',
        source: 'spec B2B2-4: this slice adds no write route',
      },
      adopt_for_revision_tracking: { available: false, source: 'spec B2B2-4: adoption is never offered' },
    });
    marker('diagnostics', 'the array itself; each row is compared leaf by leaf below');
    // Exactly what this fixture makes anomalous: an untracked legacy clip with
    // bounded words, a selected thumbnail of unknown bake provenance, and the
    // four entry-versus-sidecar disagreements it was built with.
    const conflictFields = ['caption_style', 'format', 'requested_keep_segments', 'start_second'];
    diagnosticLedger(body.diagnostics, [
      'LEGACY_TIMING_UNPROVEN', 'LEGACY_WORDS_BOUNDED', 'THUMBNAIL_BAKE_UNKNOWN',
      ...conflictFields.map(() => 'LEGACY_FIELD_CONFLICT'),
    ], conflictFields);
    return {
      leaves: leafPaths(body, '').length, conflicts: body.legacy.conflicts.length,
      diagnostics: body.diagnostics.map(d => d.code),
      reasons: Object.fromEntries(body.capabilities.map(c => [c.id, c.reason])),
    };
  });
});


// ===========================================================================
// Reads change nothing, and survive a restart (B2B2-4, B2B2-5)
// ===========================================================================

await conformance('P-C7', 'B2B2-4', 'no request created, removed or changed a stored byte', () => {
  const problems = treeProblems('after the cases');
  must(problems.length === 0, problems.slice(0, 6).join('; '));
  const untracked = entryOf(SERVE.plainMp4);
  must(untracked.revisions === undefined, 'reading an untracked clip added revision tracking');
  equal(untracked.unknown_field, { kept: true }, 'an unknown stored field was rewritten');
  return { files: Object.keys(beforeTree).length };
});

await conformance('P-C8', 'B2B2-4', 'the genuine historical evidence outside the fixture is untouched', () => {
  const changed = Object.entries(historicalOriginals).filter(([path, hash]) => sha256(path) !== hash);
  must(changed.length === 0, `historical evidence changed: ${changed.map(([p]) => basename(p)).join(', ')}`);
  return { originals: Object.keys(historicalOriginals).length };
});

console.log('Restarting the studio on a second free port...');
await stopServer();
const secondPort = await startServer();
await conformance('P-C9', 'B2B2-5', 'the same view comes back after a stop and restart on another port', async () => {
  must(secondPort !== firstPort, 'the restart reused the first port, so it proves nothing');
  const again = await context(CARD.id);
  must(again.status === 200, `the control does not read after a restart: ${j(again.body?.code)}`);
  const strip = body => { const copy = JSON.parse(JSON.stringify(body)); copy.identity.captured_at = null; return copy; };
  equal(strip(again.body), strip(CONTROL), 'the response changed across a restart');
  const problems = treeProblems('after the restart');
  must(problems.length === 0, problems.slice(0, 6).join('; '));
  return { first_port: firstPort, second_port: secondPort };
});

await stopServer();

// ===========================================================================
// Required coverage, and the run's two separate conclusions
// ===========================================================================

console.log('Required coverage claims...');

/**
 * What this run claims to have compared. Each claim is evaluated against the
 * response it names; an uncompared leaf is a gap, and a gap makes the run
 * incomplete and the exit nonzero whatever the product cases did.
 */
const REQUIRED = [
  {
    id: 'C-R1', claim: 'every leaf of the tracked card-revision response',
    ledger: trackedLedger, response: () => LEDGERED.tracked, prefix: '',
  },
  {
    id: 'C-R2', claim: 'every leaf of the legacy recovery response',
    ledger: legacyLedger, response: () => LEDGERED.legacy, prefix: '',
  },
  {
    id: 'C-R3', claim: 'every artifact leaf of the present-artifact response',
    ledger: artifactLedger, response: () => LEDGERED.artifact, prefix: 'revision.document.artifacts',
  },
];
const audits = [];
for (const requirement of REQUIRED) {
  await verifier(requirement.id, 'B2B2-5', `no uncompared leaf: ${requirement.claim}`, () => {
    const body = requirement.response();
    must(body, `${requirement.claim}: the response was never captured, so nothing was compared`);
    const scoped = requirement.prefix
      ? requirement.prefix.split('.').reduce((value, key) => value?.[key], body)
      : body;
    must(scoped !== undefined && scoped !== null,
      `${requirement.claim}: ${requirement.prefix} is absent from the captured response`);
    const audit = requirement.ledger.audit(requirement.claim, scoped, requirement.prefix);
    audits.push(audit);
    must(audit.gaps.length === 0,
      `${audit.gaps.length} uncompared leaf/leaves: ${audit.gap_shapes.slice(0, 8).join(', ')}`);
    return { leaves: audit.leaves, compared: audit.compared, by_kind: audit.by_kind };
  });
}
// A claim whose response was never captured still counts as missing coverage.
for (const requirement of REQUIRED) {
  if (!audits.some(a => a.claim === requirement.claim)) {
    audits.push({
      claim: requirement.claim, ledger: requirement.ledger.name, scope: requirement.prefix || '(whole response)',
      leaves: null, compared: 0, by_kind: {}, gaps: ['(the response was never captured)'], gap_shapes: ['(not captured)'],
    });
  }
}
const conclusion = conclude(counts, verifierCounts, audits);

const results = {
  check: 'check-editor-read-contract',
  spec_revision: 'lead-21',
  workflow_version: '4.1.0',
  instruction_inventory: 'docs/workflow/inventories/4.1.0-local-2.md',
  ran_at: new Date().toISOString(),
  fixture,
  ports: { first: firstPort, second: secondPort, configured_studio: settings.PODCLI_PORT },
  application: {
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
    sources: Object.fromEntries([
      'src/services/clip-editor-context.ts', 'src/services/clip-editor-read-contract.ts',
      'src/models/clip-editor-context.ts', 'src/ui/editor-context-route.ts', 'src/ui/web-server.ts',
      'src/services/clip-revisions.ts', 'backend/services/exact_render.py',
    ].map(p => [p, sha256(join(projectRoot, p))])),
    compiled: Object.fromEntries([
      'dist/services/clip-editor-context.js', 'dist/services/clip-editor-read-contract.js',
      'dist/models/clip-editor-context.js', 'dist/ui/editor-context-route.js', 'dist/ui/web-server.js',
      'dist/services/clip-revisions.js',
    ].map(p => [p, sha256(join(projectRoot, p))])),
  },
  verification_artifacts: artifactIdentities(),
  fixtures: {
    committed: [CARD, INTRO, OUTRO, BOTH, HARD, EMPTY, NONE, OVERLAY].map(f => ({
      label: f.label, clip_id: f.id, revision_id: f.pointer.revision_id, document: sha256(f.documentPath),
    })),
    historical: HIST.map(h => ({ clip_id: h.id, revision_id: h.pointer.revision_id, document: sha256(h.documentPath) })),
    serving: SERVE,
  },
  // The 20,001-word mapping is millions of characters; it is identified by hash
  // and endpoints here and stays reproducible from LARGE_WORDS and the oracle.
  producer_oracle: Object.fromEntries(Object.entries(ORACLE).filter(([id]) => id !== 'large-words')),
  large_transcript_oracle: {
    supplied: LARGE_WORDS.length, mapped: LARGE.content.length,
    content_sha256: createHash('sha256').update(j(LARGE.content)).digest('hex'),
    content_text_sha256: createHash('sha256').update(LARGE.content_text).digest('hex'),
    content_text_characters: LARGE.content_text.length,
    first_word: LARGE.content[0], last_word: LARGE.content[LARGE.content.length - 1],
  },
  check_kinds: KINDS,
  counts,
  verifier: verifierCounts,
  conclusion,
  coverage: { required: audits, complete: conclusion.coverage === 'complete' },
  // Reused named coverage, mapped explicitly rather than credited in prose.
  reused_coverage: [
    { claim: 'owned-path and junction refusals', acceptance: 'B2B2-3', where: 'src/services/clip-editor-context.test.ts', cases: ['refuses a junction at the configured history root itself', 'refuses a junction at a legacy sidecar ancestor with the ownership code', 'refuses a legacy sidecar directory that is a junction, with the ownership code', 'refuses to read a revision document through a junction'] },
    { claim: 'unreadable, conflicting and bounded legacy sidecar states', acceptance: 'B2B2-2', where: 'src/services/clip-editor-context.test.ts', cases: ['reports an unreadable sidecar as unreadable rather than absent', 'reports conflicting sidecars instead of guessing a faithful recipe', 'keeps a genuinely unreadable regular sidecar as a degraded recovery input', 'shows bounded words with their domain and never as full source coverage'] },
    { claim: 'draft-document contradictions', acceptance: 'B2B2-1', where: 'src/services/clip-editor-context.test.ts', cases: ['refuses a draft whose nested inputs are unusable', 'refuses a draft document that is missing, malformed or from another incarnation'] },
    { claim: 'crossfade clamp and eligibility arithmetic', acceptance: 'B2B2-1', where: 'src/services/clip-editor-context.test.ts', cases: ['refuses a crossfade its own recorded join inputs could not have produced', 'refuses a hard cut that claims an overlap, however the arithmetic is balanced'] },
    { claim: 'dangling artifact placement and placement-free artifact file', acceptance: 'B2B2-1', where: 'src/services/clip-editor-context.test.ts', cases: ['refuses artifact placements that relabel their domain or claim the card', 'refuses an artifact placed with no file, or a file placed nowhere'] },
  ],
  cases,
};
const target = outDir ?? fixture;
mkdirSync(target, { recursive: true });
const resultPath = join(target, 'check-editor-read-contract-result.json');
writeFileSync(resultPath, JSON.stringify(results, null, 2));

console.log('');
console.log(`Application cases: ${counts.pass} passed, ${counts.fail} failed, ${counts.harness} harness error(s).`);
console.log(`Verifier self-checks: ${verifierCounts.pass} passed, ${verifierCounts.fail} failed, ${verifierCounts.harness} harness error(s).`);
for (const audit of results.coverage.required) {
  const kinds = Object.entries(audit.by_kind).map(([kind, n]) => `${kind} ${n}`).join(', ') || 'none';
  console.log(`Coverage ${audit.claim}: ${audit.compared}/${audit.leaves ?? '?'} leaves compared (${kinds}).`);
  for (const gap of audit.gap_shapes) console.log(`  gap: ${gap}`);
}
for (const entry of cases.filter(c => c.status !== 'pass')) {
  const lane = entry.lane === 'verifier' ? 'ARTIFACT' : 'APPLICATION';
  console.log(`${entry.status === 'fail' ? 'FAILED' : 'HARNESS'} ${lane} ${entry.id} (${entry.acceptance}): ${entry.title}`);
  console.log(`  ${entry.detail}`);
}
console.log(`Result: ${resultPath}`);
// The two conclusions stay separate: a red application run and an incomplete
// artifact are different problems, and either one exits nonzero.
console.log(`Application verification: ${conclusion.application === 'pass' ? 'pass' : `FAIL (${conclusion.application})`}`);
console.log(`Artifact coverage: ${conclusion.coverage}`);
if (conclusion.exit) {
  if (conclusion.application !== 'pass') {
    console.log(counts.harness
      ? 'FAILED: application conformance failures and/or harness errors above.'
      : 'FAILED: the application does not meet the stated read contract.');
  }
  if (conclusion.coverage !== 'complete') {
    console.log('INCOMPLETE: required coverage is missing, or this runner failed its own accounting checks.');
  }
} else {
  console.log('Passed');
}
process.exitCode = conclusion.exit;
