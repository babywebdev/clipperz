"""Tests for the YouTube CSV sync attribution and token-state helpers."""

import json
import os
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services.integrations.youtube import sync as yt_sync
from services.integrations.youtube import client as yt_client


class CsvSyncTests(unittest.TestCase):
    def setUp(self):
        self.entries = [
            {"id": "a", "title": "Sample clip alpha", "duration": 30},
            {"id": "b", "title": "Sample clip beta", "duration": 42},
        ]
        self.saved = None

        # The locked publish step runs the callback against the current list
        # and records that a write happened.
        def fake_mutate(fn, timeout_ms=None):
            result = fn(self.entries)
            self.saved = self.entries
            return result

        self._patches = [
            mock.patch.object(yt_sync, "load_clips_history", return_value=self.entries),
            mock.patch.object(yt_sync, "mutate_clips_history", side_effect=fake_mutate),
            mock.patch.object(yt_sync, "_refresh_learnings"),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        for p in self._patches:
            p.stop()

    def _csv_rows(self, rows):
        return mock.patch.object(yt_client, "parse_analytics_csv", return_value=rows)

    def test_csv_sync_reports_each_match_with_score(self):
        rows = [
            {"title": "Sample clip alpha", "views": 1000, "retention": 55.0},
            {"title": "Sample clip beta", "views": 500, "retention": 40.0},
        ]
        with self._csv_rows(rows):
            res = yt_sync.sync_from_csv("x.csv")
        self.assertEqual(res["matched"], 2)
        self.assertEqual(len(res["links"]), 2)
        for link in res["links"]:
            self.assertIn("clip_title", link)
            self.assertIn("row_title", link)
            self.assertEqual(link["score"], 1.0)  # exact title match

    def test_csv_sync_leaves_unmatched_below_threshold(self):
        rows = [{"title": "totally unrelated topic about cooking", "views": 9}]
        with self._csv_rows(rows):
            res = yt_sync.sync_from_csv("x.csv", threshold=0.6)
        self.assertEqual(res["matched"], 0)
        self.assertEqual(len(res["unmatched"]), 2)
        self.assertIsNone(self.saved)  # nothing saved when nothing matched

    def test_csv_sync_writes_metrics_onto_matched_clip(self):
        rows = [{"title": "Sample clip beta", "views": 500, "retention": 40.0, "ctr": 5.0}]
        with self._csv_rows(rows):
            yt_sync.sync_from_csv("x.csv")
        matched = next(c for c in self.saved if c["id"] == "b")
        self.assertEqual(matched["metrics"]["views"], 500)
        self.assertIn("fetched_at", matched["metrics"])


class PublishReconciliationTests(unittest.TestCase):
    """Metrics are fetched against a snapshot and published against the current
    list under the lock: deleted clips are not resurrected, re-attributed clips
    are skipped, and concurrent edits to other fields survive."""

    def setUp(self):
        self.snapshot = [
            {"id": "a", "title": "alpha", "youtube_video_id": "V1"},
            {"id": "b", "title": "beta", "youtube_video_id": "V2"},
        ]
        self.current = None
        self.published = False

        def fake_mutate(fn, timeout_ms=None):
            self.published = True
            return fn(self.current)

        self._patches = [
            mock.patch.object(yt_sync, "load_clips_history", return_value=self.snapshot),
            mock.patch.object(yt_sync, "mutate_clips_history", side_effect=fake_mutate),
            mock.patch.object(yt_sync, "_refresh_learnings"),
            mock.patch.object(yt_client, "fetch_metrics", side_effect=lambda vid: {"views": 10, "vid": vid}),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        for p in self._patches:
            p.stop()

    def test_deleted_clip_is_not_resurrected(self):
        self.current = [{"id": "b", "title": "beta", "youtube_video_id": "V2"}]
        self.assertEqual(yt_sync.sync_metrics(), 1)
        self.assertEqual([c["id"] for c in self.current], ["b"])
        self.assertEqual(self.current[0]["metrics"]["vid"], "V2")

    def test_reattributed_clip_is_skipped(self):
        self.current = [
            {"id": "a", "title": "alpha", "youtube_video_id": "V9"},
            {"id": "b", "title": "beta", "youtube_video_id": "V2"},
        ]
        self.assertEqual(yt_sync.sync_metrics(), 1)
        self.assertNotIn("metrics", self.current[0])
        self.assertEqual(self.current[1]["metrics"]["vid"], "V2")

    def test_concurrent_edits_to_other_fields_survive(self):
        self.current = [
            {"id": "a", "title": "renamed meanwhile", "youtube_video_id": "V1", "description": "new"},
            {"id": "b", "title": "beta", "youtube_video_id": "V2"},
        ]
        self.assertEqual(yt_sync.sync_metrics(), 2)
        self.assertEqual(self.current[0]["title"], "renamed meanwhile")
        self.assertEqual(self.current[0]["description"], "new")
        self.assertEqual(self.current[0]["metrics"]["vid"], "V1")

    def test_nothing_fetched_means_no_publish(self):
        self.snapshot[:] = [{"id": "x", "title": "unlinked"}]
        self.current = list(self.snapshot)
        self.assertEqual(yt_sync.sync_metrics(), 0)
        self.assertFalse(self.published)

    def test_csv_publish_requires_the_matched_title(self):
        rows = [{"title": "alpha", "views": 3}, {"title": "beta", "views": 4}]
        self.current = [
            {"id": "a", "title": "renamed meanwhile", "youtube_video_id": "V1"},
            {"id": "b", "title": "beta", "youtube_video_id": "V2"},
        ]
        with mock.patch.object(yt_client, "parse_analytics_csv", return_value=rows):
            res = yt_sync.sync_from_csv("x.csv")
        self.assertEqual(res["matched"], 2)  # proposals reflect the snapshot
        self.assertNotIn("metrics", self.current[0])  # but publication checks attribution
        self.assertEqual(self.current[1]["metrics"]["views"], 4)


class TokenStateTests(unittest.TestCase):
    def test_is_authorized_false_when_missing(self):
        with mock.patch.object(yt_client, "_TOKEN_PATH", "/no/such/token.json"):
            self.assertFalse(yt_client.is_authorized())

    def test_is_authorized_false_for_corrupt_token(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            f.write("{not valid json")
            path = f.name
        try:
            with mock.patch.object(yt_client, "_TOKEN_PATH", path):
                self.assertFalse(yt_client.is_authorized())
        finally:
            os.unlink(path)

    def test_is_authorized_true_with_refresh_token(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump({"refresh_token": "1//abc", "token": "ya29"}, f)
            path = f.name
        try:
            with mock.patch.object(yt_client, "_TOKEN_PATH", path):
                self.assertTrue(yt_client.is_authorized())
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
