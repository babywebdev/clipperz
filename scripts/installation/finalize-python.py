"""Record the environment and verify FFmpeg/Whisper audio decoding on a disposable fixture."""
import importlib.metadata as metadata
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

project = Path(__file__).resolve().parents[2]
root = project / "_local/installation"
root.mkdir(parents=True, exist_ok=True)
packages = sorted(({"name": dist.metadata["Name"], "version": dist.version} for dist in metadata.distributions()), key=lambda item: item["name"].lower())
(root / "python-environment.json").write_text(json.dumps({"python": sys.version, "executable": sys.executable, "packages": packages}, indent=2), encoding="utf-8")
frozen = subprocess.run([sys.executable, "-I", "-B", "-m", "pip", "--isolated", "--disable-pip-version-check", "freeze", "--all"], capture_output=True, text=True, check=True)
(root / "python-freeze.txt").write_text(frozen.stdout, encoding="utf-8")

for tool, key in [("ffmpeg", "FFMPEG_PATH"), ("ffprobe", "FFPROBE_PATH")]:
    assert Path(shutil.which(tool)).resolve() == Path(os.environ[key]).resolve(), tool
    subprocess.run([os.environ[key], "-version"], capture_output=True, check=True)

import numpy as np
import whisper
with tempfile.TemporaryDirectory(prefix="clipperz-dependency-audio-", dir=os.environ["TEMP"]) as temporary:
    fixture = Path(temporary) / "silence.wav"
    with wave.open(str(fixture), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(bytes(16000 * 2))
    samples = whisper.load_audio(str(fixture))
    assert samples.shape == (16000,) and np.all(samples == 0)
    probe = subprocess.run([os.environ["FFPROBE_PATH"], "-v", "error", "-show_entries", "format=duration", "-of", "json", str(fixture)], capture_output=True, text=True, check=True)
    assert float(json.loads(probe.stdout)["format"]["duration"]) == 1.0

models = {}
for name in ["face_detection_yunet_2023mar.onnx", "yamnet.onnx"]:
    path = project / "backend/models" / name
    with path.open("rb") as stream:
        models[name] = hashlib.file_digest(stream, "sha256").hexdigest()
record = {"passed": True, "ffmpegOnChildPath": os.environ["FFMPEG_PATH"], "ffprobeOnChildPath": os.environ["FFPROBE_PATH"], "whisperFfmpegDecodeSamples": 16000, "syntheticDurationSeconds": 1, "fixtureRemoved": True, "installedDistributionsIncludingPip": len(packages), "bundledModelHashes": models}
(root / "ffmpeg-verification.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
print(json.dumps(record, indent=2))
