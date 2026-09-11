"""The reviewed larger-foreground layout, independent of speaker cropping."""
import math


def normalize_framing(value):
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("Foreground framing must be an object")
    mode = value.get("mode", "larger")
    if mode not in ("larger", "fit", "manual"):
        raise ValueError("Invalid framing mode")
    if mode != "larger":
        background = value.get("background", "blur")
        if background not in ("blur", "black"):
            raise ValueError("Invalid framing background")
        result = {"mode": mode, "background": background}
        for key, default, low, high in (("zoom", 1, .5, 4), ("positionX", 50, 0, 100), ("positionY", 50, 0, 100)):
            number = value.get(key, default)
            if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number) or not low <= number <= high:
                raise ValueError(f"{key} must be between {low} and {high}")
            if mode == "manual":
                result[key] = number
        return result
    trim = value.get("sideTrimPercent", 13)
    bottom = value.get("foregroundBottom", 0.658)
    for name, number, low, high in (("Side trim", trim, 0, 15),
                                     ("Foreground bottom", bottom, .5, .85)):
        if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number) or not low <= number <= high:
            raise ValueError(f"{name} must be between {low} and {high}")
    return {"sideTrimPercent": trim, "foregroundBottom": bottom}


def framing_geometry(width, height, value):
    spec = normalize_framing(value)
    crop_width = math.floor(width * (1 - 2 * spec["sideTrimPercent"] / 100) / 2) * 2
    crop_x = math.floor((width - crop_width) / 4) * 2
    if crop_width < 2 or height < 2:
        raise ValueError("Source is too small for foreground framing")
    foreground_height = math.floor((height * 1080 / crop_width) / 2 + .5) * 2
    top = 1920 * spec["foregroundBottom"] - foreground_height
    if top < 0:
        raise ValueError("Foreground would extend above the frame. Reduce side trim or increase foreground bottom.")
    return crop_x, crop_width, foreground_height, top


def frame_geometry(width, height, value, target_dims=(1080, 1920)):
    spec = normalize_framing(value)
    tw, th = target_dims
    if width < 2 or height < 2:
        raise ValueError("Source is too small for framing")
    if spec.get("mode", "larger") == "larger":
        if target_dims != (1080, 1920):
            raise ValueError("Larger foreground requires vertical 1080x1920 output")
        x, cw, fh, top = framing_geometry(width, height, spec)
        return x, 0, cw, height, 1080, fh, 0, math.floor(top / 2) * 2
    zoom = spec.get("zoom", 1)
    scale = min(tw / width, th / height)
    fw = max(2, math.floor(width * scale * zoom / 2) * 2)
    fh = max(2, math.floor(height * scale * zoom / 2) * 2)
    x = math.floor(((tw - fw) / 2 + (spec.get("positionX", 50) - 50) / 100 * tw) / 2) * 2
    y = math.floor(((th - fh) / 2 + (spec.get("positionY", 50) - 50) / 100 * th) / 2) * 2
    return 0, 0, width, height, fw, fh, x, y


def framing_filter(width, height, value, target_dims=(1080, 1920)):
    spec = normalize_framing(value)
    if spec.get("mode", "larger") != "larger":
        tw, th = target_dims
        sx, sy, sw, sh, fw, fh, dx, dy = frame_geometry(width, height, spec, target_dims)
        # Derive the backdrop from the same input so duration and timestamps
        # remain tied to the source, including when there is no audio stream.
        background = (f"scale={tw}:{th}:force_original_aspect_ratio=increase,crop={tw}:{th},boxblur=30:2"
                      if spec["background"] == "blur" else f"scale={tw}:{th},drawbox=c=black:t=fill")
        return (f"[0:v]split[bg][fg];[bg]{background}[back];"
                f"[fg]crop={sw}:{sh}:{sx}:{sy},scale={fw}:{fh}[sharp];"
                f"[back][sharp]overlay={dx}:{dy},setsar=1,fps=30,format=yuv420p[v]")
    frame_geometry(width, height, spec, target_dims)
    x, crop_width, foreground_height, _ = framing_geometry(width, height, spec)
    return (
        "[0:v]split[bg][fg];"
        "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2[blur];"
        f"[fg]crop={crop_width}:{height}:{x}:0,scale=1080:{foreground_height}[sharp];"
        f"[blur][sharp]overlay=0:H*{spec['foregroundBottom']}-h,setsar=1,fps=30,format=yuv420p[v]"
    )


def render_foreground(input_path, output_path, value, target_dims=(1080, 1920)):
    from services.media_probe import get_dimensions, run_ffmpeg_with_fallback
    width, height = get_dimensions(input_path)
    result = run_ffmpeg_with_fallback(
        cmd_parts_before_enc=["ffmpeg", "-y", "-i", input_path,
                              "-filter_complex", framing_filter(width, height, value, target_dims),
                              "-map", "[v]", "-map", "0:a?"],
        cmd_parts_after_enc=["-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart"],
        output_path=output_path, label="foreground_framing",
    )
    if not result:
        raise RuntimeError("Foreground rendering failed")
    return result
