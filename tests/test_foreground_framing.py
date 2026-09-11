import pytest
from services.foreground_framing import framing_filter, framing_geometry, normalize_framing, frame_geometry


def test_matches_approved_1920_source_recipe():
    spec = {"sideTrimPercent": 13, "foregroundBottom": .658}
    x, width, height, top = framing_geometry(1920, 1080, spec)
    assert (x, width, height) == (250, 1420, 822)
    assert top + height == pytest.approx(1920 * .658)
    graph = framing_filter(1920, 1080, spec)
    assert "crop=1420:1080:250:0" in graph
    assert "overlay=0:H*0.658-h" in graph


@pytest.mark.parametrize("value", [False, [], {"sideTrimPercent": 16}, {"sideTrimPercent": "13"},
                                   {"foregroundBottom": float("nan")}, {"foregroundBottom": .9}])
def test_rejects_invalid_settings(value):
    with pytest.raises(ValueError):
        normalize_framing(value)


def test_rejects_layout_that_cuts_off_top():
    with pytest.raises(ValueError, match="above the frame"):
        framing_geometry(1080, 1920, {})


def test_no_trim_preserves_full_source_width():
    assert framing_geometry(1920, 1080, {"sideTrimPercent": 0})[:2] == (0, 1920)


def test_main_renderer_accepts_framing_and_validates_before_work(tmp_path):
    from services.clip_generator import generate_clip
    source = tmp_path / 'source.mp4'
    source.write_bytes(b'validation should happen before decoding')
    with pytest.raises(ValueError, match="vertical"):
        generate_clip(str(source), 0, 4, format='horizontal', foreground_framing={})


@pytest.mark.parametrize("source", [(1920, 1080), (1080, 1920), (1000, 1000)])
@pytest.mark.parametrize("target", [(1080, 1920), (1920, 1080), (1080, 1080)])
def test_fit_keeps_all_edges(source, target):
    sx, sy, sw, sh, fw, fh, dx, dy = frame_geometry(*source, {"mode": "fit"}, target)
    assert (sx, sy, sw, sh) == (0, 0, *source)
    assert 0 <= dx and 0 <= dy
    assert dx + fw <= target[0] and dy + fh <= target[1]


def test_manual_export_geometry_matches_preview():
    spec = {"mode": "manual", "zoom": 2, "positionX": 75, "positionY": 25}
    assert frame_geometry(1920, 1080, spec)[4:] == (2160, 1214, -270, -128)
    assert 'overlay=-270:-128' in framing_filter(1920, 1080, spec)
    assert 'drawbox=c=black:t=fill' in framing_filter(1920, 1080, {"mode": "fit", "background": "black"})


@pytest.mark.parametrize("value", [{"mode": "manual", "zoom": 5}, {"mode": "manual", "positionX": -1},
                                   {"mode": "manual", "zoom": True}, {"mode": "fit", "background": "image"}])
def test_rejects_invalid_manual_framing(value):
    with pytest.raises(ValueError):
        normalize_framing(value)
