"""Render the complete uploaded episode with the Studio's framing and captions."""
import os
import shutil
import tempfile

from services.clip_generator import _render_with_remotion, _clean_transcript_words
from services.foreground_framing import normalize_framing, render_foreground
from services.formats import get_format
from services.media_probe import get_media_duration_seconds, get_dimensions
from services.video_processor import crop_to_vertical, fit_to_frame, normalize_audio, concat_outro


def export_full_episode(video_path, output_path, transcript_words, format='vertical',
                        crop_strategy='center', foreground_framing=None,
                        caption_style='hormozi', caption_position='auto', caption_font_scale=100,
                        logo_position='top-left', logo_path=None, intro_path=None, outro_path=None,
                        clean_fillers=True, face_map=None, progress_callback=None):
    if format not in ('vertical', 'horizontal', 'square'):
        raise ValueError('Choose vertical, horizontal, or square output.')
    framing = normalize_framing(foreground_framing)
    if framing and framing.get('mode', 'larger') == 'larger' and format != 'vertical':
        raise ValueError('Larger foreground requires vertical output.')
    if not os.path.isfile(video_path):
        raise FileNotFoundError('Source episode not found.')
    if os.path.exists(output_path):
        raise FileExistsError('The output already exists; export another copy.')
    duration = get_media_duration_seconds(video_path)
    if duration <= 0:
        raise ValueError('Could not determine the full episode duration.')
    for asset in (logo_path, intro_path, outro_path):
        if asset and not os.path.isfile(asset):
            raise FileNotFoundError(f'Asset not found: {asset}')
    spec = get_format(format)
    output_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(output_dir, exist_ok=True)
    def progress(p, message):
        if progress_callback:
            progress_callback(p, message)
    with tempfile.TemporaryDirectory(prefix='full-episode-', dir=output_dir) as work:
        framed = os.path.join(work, 'framed.mp4')
        progress(2, f'Applying {format} framing to the full episode')
        if framing:
            render_foreground(video_path, framed, framing, target_dims=spec.dims)
        elif spec.reframe:
            crop_to_vertical(video_path, framed, strategy=crop_strategy,
                             transcript_words=transcript_words, clip_start=0, face_map=face_map, target_dims=spec.dims)
        else:
            fit_to_frame(video_path, framed, target_dims=spec.dims)
        # Full export retains the entire timeline. Filler cleaning affects only
        # captions here; silence removal is the explicit way to cut the episode.
        words = [w for w in transcript_words if w['end'] > 0 and w['start'] < duration]
        if clean_fillers:
            words = _clean_transcript_words(words)
        captioned = os.path.join(work, 'captioned.mp4')
        ok, _ = _render_with_remotion(framed, words, caption_style, captioned,
            caption_position=caption_position, caption_font_scale=caption_font_scale,
            logo_position=logo_position, logo_path=logo_path, chunked=True,
            progress_callback=lambda p, m: progress(20 + int(p * .65), m))
        if not ok:
            raise RuntimeError('Full-episode caption render failed. See the renderer log for details.')
        progress(87, 'Preparing episode audio')
        current = os.path.join(work, 'audio.mp4')
        normalize_audio(captioned, current)
        if intro_path:
            from services.video_processor import scale_to_frame
            progress(91, 'Adding intro')
            intro = os.path.join(work, 'intro.mp4')
            scale_to_frame(intro_path, intro, *spec.dims)
            joined = os.path.join(work, 'with-intro.mp4')
            concat_outro(intro, current, joined, crossfade_duration=0)
            current = joined
        if outro_path:
            progress(94, 'Adding outro')
            joined = os.path.join(work, 'with-outro.mp4')
            concat_outro(current, outro_path, joined, crossfade_duration=0)
            current = joined
        width, height = get_dimensions(current)
        final_duration = get_media_duration_seconds(current, duration)
        shutil.move(current, output_path)
    progress(100, 'Full episode ready')
    return {'output_path': output_path, 'filename': os.path.basename(output_path),
            'file_size_mb': round(os.path.getsize(output_path) / 1024 / 1024, 2),
            'format': format, 'caption_style': caption_style, 'duration': final_duration,
            'width': width, 'height': height}
