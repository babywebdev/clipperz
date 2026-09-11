import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services import full_episode as F


class FullEpisodeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = str(Path(self.tmp.name) / 'source.mp4')
        Path(self.source).write_bytes(b'source')
        self.output = str(Path(self.tmp.name) / 'output.mp4')
        self.words = [{'word': 'um', 'start': 2, 'end': 3}, {'word': 'Zelda', 'start': 3, 'end': 4}]
        def copy(src, dest, *args, **kwargs): Path(dest).write_bytes(b'video')
        self.frame = patch.object(F, 'render_foreground', side_effect=copy).start()
        self.crop = patch.object(F, 'crop_to_vertical', side_effect=copy).start()
        self.fit = patch.object(F, 'fit_to_frame', side_effect=copy).start()
        self.normalize = patch.object(F, 'normalize_audio', side_effect=copy).start()
        patch.object(F, 'get_media_duration_seconds', return_value=7200).start()
        patch.object(F, 'get_dimensions', return_value=(1080, 1920)).start()
        def render(video, words, style, output, **kwargs):
            Path(output).write_bytes(b'captioned'); return True, None
        self.render = patch.object(F, '_render_with_remotion', side_effect=render).start()
        self.addCleanup(patch.stopall)

    def test_full_timeline_and_manual_settings_reach_shared_renderers(self):
        framing = {'mode': 'manual', 'zoom': 1.6, 'positionX': 52, 'positionY': 42, 'background': 'blur'}
        result = F.export_full_episode(self.source, self.output, self.words, foreground_framing=framing,
            caption_style='karaoke', caption_position='upper', caption_font_scale=115, clean_fillers=False)
        self.assertEqual(self.frame.call_args.args[0], self.source)
        self.assertEqual(self.frame.call_args.args[2], framing)
        self.assertEqual(self.frame.call_args.kwargs['target_dims'], (1080, 1920))
        self.assertEqual(self.render.call_args.args[1], self.words)
        self.assertEqual(self.render.call_args.kwargs['caption_position'], 'upper')
        self.assertEqual(self.render.call_args.kwargs['caption_font_scale'], 115)
        self.assertTrue(self.render.call_args.kwargs['chunked'])
        self.assertEqual(result['duration'], 7200)
        self.assertEqual(Path(self.source).read_bytes(), b'source')

    def test_clean_fillers_changes_captions_without_cutting_the_source(self):
        F.export_full_episode(self.source, self.output, self.words, format='horizontal')
        self.assertEqual(self.fit.call_args.args[0], self.source)
        self.assertEqual([w['word'] for w in self.render.call_args.args[1]], ['Zelda'])
        self.assertEqual(self.render.call_args.args[1][0]['start'], 3)

    def test_square_uses_the_selected_crop_strategy(self):
        F.export_full_episode(self.source, self.output, self.words, format='square', crop_strategy='speaker')
        self.assertEqual(self.crop.call_args.kwargs['target_dims'], (1080, 1080))
        self.assertEqual(self.crop.call_args.kwargs['strategy'], 'speaker')

    def test_failed_captions_publish_no_output_and_preserve_source(self):
        self.render.side_effect = None; self.render.return_value = (False, None)
        with self.assertRaisesRegex(RuntimeError, 'caption render failed'):
            F.export_full_episode(self.source, self.output, self.words)
        self.assertFalse(os.path.exists(self.output))
        self.assertEqual(list(Path(self.tmp.name).iterdir()), [Path(self.source)])

    def test_invalid_framing_and_existing_outputs_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Larger foreground'):
            F.export_full_episode(self.source, self.output, self.words, format='horizontal', foreground_framing={})
        Path(self.output).write_bytes(b'old export')
        with self.assertRaises(FileExistsError):
            F.export_full_episode(self.source, self.output, self.words)
        self.assertEqual(Path(self.output).read_bytes(), b'old export')
