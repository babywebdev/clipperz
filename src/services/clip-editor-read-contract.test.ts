import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

// Writing Studio 1B.2b.2 repair-3: the pure read contract on its own.
//
// The aggregate's document relationships are exercised against real committed
// documents in clip-editor-context.test.ts, where the accepted save service
// actually writes them. What is proved here is what only this module can be
// asked: that it is pure, that it keeps no edge to the save service, and that
// it classifies the clip entry's own output summary — the value the existing
// by-id routes resolve through — into the four separate states the response
// depends on, without reading anything.

const {
  validateEditorRecord,
  validateRevisionState,
} = await import("./clip-editor-read-contract.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const moduleSource = readFileSync(join(projectRoot, "src/services/clip-editor-read-contract.ts"), "utf-8");

const OUTPUT = process.platform === "win32" ? "C:\\clips\\exports\\saved_short.mp4" : "/clips/exports/saved_short.mp4";
const OTHER = process.platform === "win32" ? "C:\\clips\\exports\\other_short.mp4" : "/clips/exports/other_short.mp4";

/** A tracked state whose current revision is the untouched legacy version zero:
 * a real writer state with no immutable document to read, so the summary
 * classification can be exercised on its own. */
const legacyState = (over: Record<string, unknown> = {}) => ({
  schema: 1,
  incarnation: "inc-1",
  draft: null,
  draft_version: 0,
  revision_version: 0,
  current: {
    revision_id: "rev-0", version: 0, provenance: "legacy-unversioned",
    path: null, group_root: null, operation_id: null,
    output_path: OUTPUT, committed_at: "2026-09-01T00:00:00.000Z",
  },
  previous: null,
  operations: [],
  ...over,
});

const classify = (entrySummary: unknown, state: unknown = legacyState(), servedFile: { path: string; resolvedFile: string | null } | null = null) =>
  validateEditorRecord({
    clipId: "clip-a",
    entrySummary,
    servedFile,
    state: state as never,
    revisionDocument: null,
    draftDocument: null,
  });

describe("the read contract is a pure boundary", () => {
  it("imports no filesystem, process or save-service module", () => {
    const valueImports = [...moduleSource.matchAll(/^import\s+(?!type\s)([^;]*?)\s*from\s*["']([^"']+)["']/gm)]
      .filter(([, clause]) => !/^\{\s*type\s[^,}]+(,\s*type\s[^,}]+)*\s*,?\s*\}$/.test(clause.trim()))
      .map(([, , specifier]) => specifier);
    // `path` is lexical string work; nothing here opens, stats or hashes a file.
    expect(valueImports.sort()).toEqual(["../models/clip-editor-context.js", "path"]);
    for (const forbidden of ["fs", "fs/promises", "node:fs", "./clip-revisions.js", "./clips-history.js"]) {
      expect(valueImports).not.toContain(forbidden);
    }
    expect(moduleSource).not.toMatch(/\bawait\s+(readFile|stat|lstat|readdir)\b/);
  });

  it("validates a whole record from plain values, with no argument that could read anything", () => {
    const record = classify(OUTPUT);
    expect(record.current).toMatchObject({ version: 0, provenance: "legacy-unversioned" });
    expect(record.document).toBeNull();
    expect(record.draft).toBeNull();
  });
});

describe("the entry summary the by-id routes resolve", () => {
  it.each([
    ["the revision's own file", OUTPUT, "equal"],
    ["another file", OTHER, "different"],
    ["absent", undefined, "absent"],
    ["null", null, "absent"],
    ["an empty string", "", "invalid"],
    ["an object", { path: OUTPUT }, "invalid"],
    ["a number", 42, "invalid"],
  ])("classifies a summary that is %s", (_label, summary, expected) => {
    expect(classify(summary).summary).toBe(expected);
  });

  it("compares paths the way the rest of this reader and the save service do", () => {
    // Resolved, and case-insensitive on Windows: the same comparison the
    // ownership checks use. A trailing-dot or doubled separator form of the
    // same path is the same file.
    const sameShape = OUTPUT.replace(/([\\/])exports\1/, "$1exports$1.$1");
    expect(classify(sameShape).summary).toBe("equal");
    if (process.platform === "win32") expect(classify(OUTPUT.toUpperCase()).summary).toBe("equal");
  });

  it("reports untracked when there is no revision to compare against", () => {
    expect(classify(OUTPUT, null).summary).toBe("untracked");
    expect(classify(OUTPUT, null).current).toBeNull();
  });

  it.each([
    [".mp4", "supported"],
    [".mov", "supported"],
    [".mkv", "supported"],
    [".webm", "supported"],
    [".MP4", "supported"],
    [".avi", "unsupported"],
    [".mp4.txt", "unsupported"],
    ["", "unsupported"],
  ])("judges a served file ending %s as %s", (suffix, expected) => {
    const path = OUTPUT.replace(/\.mp4$/, suffix);
    const state = legacyState();
    (state.current as Record<string, unknown>).output_path = path;
    expect(classify(path, state).servedKind).toBe(expected);
  });

  it("cannot judge the kind of a summary it does not have", () => {
    expect(classify(undefined).servedKind).toBe("unknown");
    expect(classify("").servedKind).toBe("unknown");
  });

  // Lead-22: `serveClipById` checks the extension of the regular file the
  // summary resolves to. The service reports that fact; this module judges it.
  it.each([
    ["a supported name over an unsupported file", ".mp4", ".avi", "unsupported"],
    ["an unsupported name over a supported file", ".avi", ".mp4", "supported"],
    ["a supported name over a supported file", ".mp4", ".webm", "supported"],
  ])("judges %s by the file it resolves to", (_label, name, target, expected) => {
    const path = OUTPUT.replace(/\.mp4$/, name);
    const state = legacyState();
    (state.current as Record<string, unknown>).output_path = path;
    const record = classify(path, state, { path, resolvedFile: OTHER.replace(/\.mp4$/, target) });
    expect([record.summary, record.servedKind]).toEqual(["equal", expected]);
  });

  it("judges by name when the summary resolves to no regular file", () => {
    // The route refuses it before the kind matters; availability says why.
    expect(classify(OUTPUT, legacyState(), { path: OUTPUT, resolvedFile: null }).servedKind).toBe("supported");
  });

  it("ignores a resolution of any path other than the summary it judges", () => {
    const avi = OTHER.replace(/\.mp4$/, ".avi");
    expect(classify(OUTPUT, legacyState(), { path: OTHER, resolvedFile: avi }).servedKind).toBe("supported");
  });
});

describe("tracked state the response cannot describe", () => {
  const invalid = (over: Record<string, unknown>) =>
    expect(() => validateRevisionState({ ...legacyState(), ...over })).toThrow(
      expect.objectContaining({ code: "REVISION_STATE_INVALID", status: 500 }),
    );

  it("refuses a counter with no pointer to name its version", () => {
    invalid({ current: null, revision_version: 2 });
    invalid({ draft: null, draft_version: 1 });
  });

  it("refuses a pointer and a counter that disagree", () => {
    invalid({ revision_version: 3 });
  });

  it("refuses a provenance that mixes the two kinds of pointer", () => {
    invalid({ current: { ...legacyState().current, provenance: "exact" } });
    invalid({ current: { ...legacyState().current, version: 2 } });
    invalid({ current: { ...legacyState().current, path: "/somewhere/rev.json" } });
  });

  it("accepts the genuine version-zero record", () => {
    expect(validateRevisionState(legacyState())).toMatchObject({ revision_version: 0, draft_version: 0 });
  });
});
