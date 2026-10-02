"""Independent producer oracle for the editor read-contract proof (1B.2b.2, lead-19).

Verification support only. Reads a JSON job file and writes a JSON result file,
computing expected values with the accepted producer helpers in
backend/services/exact_render.py and nothing else. It imports no TypeScript
reader, no save service and no Clipperz runtime state, so an expectation
produced here cannot be derived from the validator under test.

Usage: python producer-oracle.py <job.json> <result.json>

Job shape: {"jobs": [{"id": ..., "op": ..., ...}, ...]}

  op "map_words"  {words, segments}                       -> words_in_intervals,
                                                             map_words_to_content,
                                                             content_text,
                                                             content_intervals,
                                                             content_duration
  op "bookend"    {kind, report, output_start}            -> bookend_region
  op "tolerance"  {segment_count, source_fps, output_fps,
                   bookend_count}                         -> timing_tolerance
"""

import json
import os
import sys

_HERE = os.path.abspath(__file__)
# .../scripts/verification/fixtures/editor-read-contract/producer-oracle.py
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_HERE)))))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services import exact_render as er  # noqa: E402


def run(job):
    op = job["op"]
    if op == "map_words":
        words = job["words"]
        segments = job["segments"]
        return {
            "source": er.words_in_intervals(words, segments),
            "content": er.map_words_to_content(words, segments),
            "content_text": er.content_text(er.map_words_to_content(words, segments)),
            "content_intervals": er.content_intervals(segments),
            "content_duration": round(er.content_duration(segments), 3),
        }
    if op == "bookend":
        return er.bookend_region(
            kind=job["kind"], report=job["report"], output_start=job["output_start"],
        )
    if op == "tolerance":
        return er.timing_tolerance(
            segment_count=job["segment_count"],
            source_fps=job.get("source_fps"),
            output_fps=job.get("output_fps"),
            bookend_count=job["bookend_count"],
        )
    raise ValueError("unknown op %r" % (op,))


def main():
    with open(sys.argv[1], "r", encoding="utf-8") as handle:
        spec = json.load(handle)
    results = {}
    for job in spec["jobs"]:
        try:
            results[job["id"]] = {"ok": True, "value": run(job)}
        except Exception as error:  # reported, never swallowed into a pass
            results[job["id"]] = {"ok": False, "error": "%s: %s" % (type(error).__name__, error)}
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        json.dump({
            "producer": os.path.join(BACKEND_ROOT, "services", "exact_render.py"),
            "render_timeline_version": er.RENDER_TIMELINE_VERSION,
            "results": results,
        }, handle, indent=2)
    print("oracle jobs=%d ok=%d" % (len(results), sum(1 for r in results.values() if r["ok"])))


if __name__ == "__main__":
    main()
