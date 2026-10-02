// Disposable child-process worker for the revision save service (Writing
// Studio 1B.2a). Run through tsx with PODCLI_HOME/PODCLI_DATA/PODCLI_OUTPUT
// pointing at an isolated fixture and CLIPPERZ_TEST_SOURCE at a synthetic
// source file. Never run against a real installation.
//
// Modes
//   save <clipId> <opId> <mode> <incarnation> <draftV> <revV> [marker] [go]
//        mode: none | kill-before-commit | kill-after-commit
//              | wait-before-commit | wait-before-render
//        wait-* create <marker> at the barrier and continue once <go> exists;
//        kill-* end this process with SIGKILL at the barrier (no handlers run)
//   replay <clipId> <opId> <incarnation> <draftV> <revV>
//        same request through a renderer that must not be called
//   invalidate <clipId> <opId> <incarnation>
//   draft <clipId> <incarnation> <draftV> <revV>
//   state <clipId>
//   verify <clipId> <revisionId>   reopen the immutable document and recheck its files
// With CLIPPERZ_TEST_CARD_IMAGE and CLIPPERZ_TEST_CARD_SHA256 set, save and replay
// requests carry that opening card (1B.2b.1) and use the fake composer; the
// kill-after-compose mode ends the process right after composition.
// Exit codes: 0 ok (JSON on stdout), 2 surfaced typed error (JSON on stderr), 3 usage.
import { existsSync, writeFileSync } from "fs";
import { ClipsHistory, HistoryReadError, FileLockError } from "../../../src/services/clips-history.js";
import { ClipRevisionService, ClipRevisionError, type ClipRevisionHooks } from "../../../src/services/clip-revisions.js";
import { fakeCompose, fakeExactRender, fakeProbe, fakeStreams } from "../../../src/services/clip-revisions.test-support.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFile(path: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (!existsSync(path)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path}`);
    await sleep(10);
  }
}

const WORDS = ["red", "green", "blue", "yellow", "cyan", "magenta"].map((word, i) => ({ word, start: i + 0.2, end: i + 0.7, confidence: 1 }));

function cardFromEnv() {
  const image = process.env.CLIPPERZ_TEST_CARD_IMAGE;
  return image ? { image_path: image, image_sha256: process.env.CLIPPERZ_TEST_CARD_SHA256!, placement: "opening" as const, duration: 1.5 as const } : undefined;
}

function request(clipId: string, opId: string, incarnation: string, draftV: string, revV: string) {
  const card = cardFromEnv();
  return {
    ...(card ? { thumbnail_card: card } : {}),
    clip_id: clipId,
    operation_id: opId,
    expected: { incarnation, draft_version: Number(draftV), revision_version: Number(revV) },
    recipe: {
      source_video: process.env.CLIPPERZ_TEST_SOURCE!,
      title: "Process clip",
      keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
      caption_style: "karaoke",
      crop_strategy: "center",
      format: "vertical" as const,
      clean_fillers: false,
    },
    source_words: WORDS,
  };
}

function barrier(mode: string, marker?: string, go?: string): ClipRevisionHooks {
  const die = () => {
    process.kill(process.pid, "SIGKILL");
    return new Promise<void>(() => {});
  };
  const wait = async () => {
    writeFileSync(marker!, String(process.pid), "utf-8");
    await waitForFile(go!);
  };
  switch (mode) {
    case "none": return {};
    case "kill-before-commit": return { beforeCommit: die };
    case "kill-after-commit": return { afterCommit: die };
    case "kill-after-compose": return { afterCompose: die };
    case "wait-before-commit": return { beforeCommit: wait };
    case "wait-before-render": return { beforeRender: wait };
    default: throw new Error(`unknown mode ${mode}`);
  }
}

async function main(argv: string[]): Promise<number> {
  const [mode, ...args] = argv;
  const history = new ClipsHistory();
  let result: unknown;
  try {
    if (mode === "save") {
      const [clipId, opId, barrierMode, incarnation, draftV, revV, marker, go] = args;
      const render = fakeExactRender();
      const compose = fakeCompose();
      const svc = new ClipRevisionService({ history, render, probe: fakeProbe, compose, streams: fakeStreams, hooks: barrier(barrierMode, marker, go) });
      const r = await svc.saveRevision(request(clipId, opId, incarnation, draftV, revV));
      result = { outcome: r.outcome, replayed: r.replayed, renders: render.calls, composes: compose.calls, revision_id: r.outcome === "committed" ? r.revision.revision_id : null, operation: r.operation };
    } else if (mode === "replay") {
      const [clipId, opId, incarnation, draftV, revV] = args;
      const render = fakeExactRender({ failWith: new Error("replay must not render") });
      const compose = fakeCompose({ failWith: new Error("replay must not compose") });
      const svc = new ClipRevisionService({ history, render, probe: fakeProbe, compose, streams: fakeStreams });
      const r = await svc.saveRevision(request(clipId, opId, incarnation, draftV, revV));
      result = { outcome: r.outcome, replayed: r.replayed, renders: render.calls, composes: compose.calls, revision_id: r.outcome === "committed" ? r.revision.revision_id : null, operation: r.operation };
    } else if (mode === "invalidate") {
      result = await new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe }).invalidateOperation({ clip_id: args[0], operation_id: args[1], expected_incarnation: args[2], reason: "worker invalidate" });
    } else if (mode === "draft") {
      const [clipId, incarnation, draftV, revV] = args;
      const req = request(clipId, "unused", incarnation, draftV, revV);
      result = await new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe }).saveDraft({ clip_id: clipId, expected: req.expected, draft: { recipe: { ...req.recipe, title: "Draft edit" }, source_words: WORDS } });
    } else if (mode === "state") {
      result = await new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe }).getState(args[0]);
    } else if (mode === "verify") {
      const svc = new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe });
      const doc = await svc.loadRevision(args[0], args[1]);
      result = { revision_id: doc.revision_id, version: doc.version, checks: await svc.verifyRevisionFiles(doc), source_words: doc.source_words?.length ?? null, content_text: doc.render_timeline.words.content_text };
    } else return 3;
  } catch (err) {
    if (err instanceof ClipRevisionError || err instanceof HistoryReadError || err instanceof FileLockError) {
      process.stderr.write(JSON.stringify({ name: err.name, code: (err as { code?: string }).code, message: err.message }) + "\n");
      return 2;
    }
    throw err;
  }
  process.stdout.write(JSON.stringify(result ?? null) + "\n");
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(String(err?.stack || err) + "\n");
    process.exit(1);
  },
);
