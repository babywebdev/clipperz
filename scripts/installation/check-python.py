"""Offline dependency/native-runtime smoke checks; no app entry point or user media."""
import importlib.metadata as metadata
import io
import json
import os
import platform
import sys
from pathlib import Path

project = Path(__file__).resolve().parents[2]
root = project / "_local/installation"
root.mkdir(parents=True, exist_ok=True)
venv = project / "_local/clipperz/venv"
assert Path(sys.prefix).resolve() == venv.resolve()
assert sys.prefix != sys.base_prefix

def no_python_network(event, args):
    if event in {"socket.connect", "socket.getaddrinfo"}:
        raise RuntimeError("Network access is not allowed in this offline verification")

sys.addaudithook(no_python_network)
print("Importing installed Python libraries...", flush=True)
import numpy as np
import cv2
import onnxruntime as ort
import numba
import torch
import whisper
import tiktoken
import questionary
import dotenv
import yt_dlp
from PIL import Image

for module in [np, cv2, ort, numba, torch, whisper, tiktoken, questionary, dotenv, yt_dlp]:
    assert Path(module.__file__).resolve().is_relative_to(venv.resolve()), module.__name__
settings = dotenv.dotenv_values(os.environ["PODCLI_ENV_FILE"])
for key in ["PODCLI_HOME", "PODCLI_DATA", "PODCLI_OUTPUT", "PYTHON_PATH", "PODCLI_ENGINE", "XDG_CACHE_HOME"]:
    assert settings[key] == os.environ[key], key

print("Checking CUDA and Numba...", flush=True)
assert torch.cuda.is_available(), "CUDA is unavailable; do not silently claim GPU support"
device = torch.cuda.get_device_properties(0)
matrix = torch.ones((32, 32), device="cuda")
assert (matrix @ matrix).sum().item() == 32768
torch.cuda.synchronize()

@numba.njit
def sum_squares(values):
    total = 0.0
    for value in values:
        total += value * value
    return total

assert sum_squares(np.arange(32, dtype=np.float64)) == 10416.0
assert cv2.resize(np.zeros((8, 8, 3), dtype=np.uint8), (4, 4)).shape == (4, 4, 3)
buffer = io.BytesIO()
Image.new("RGB", (8, 8), "black").save(buffer, format="PNG")
buffer.seek(0)
assert Image.open(buffer).size == (8, 8)

print("Checking bundled face and audio models...", flush=True)
detector = cv2.FaceDetectorYN.create(str(project / "backend/models/face_detection_yunet_2023mar.onnx"), "", (320, 320))
_, faces = detector.detect(np.zeros((320, 320, 3), dtype=np.uint8))
assert faces is None or len(faces) == 0
ort.disable_telemetry_events()
options = ort.SessionOptions()
options.intra_op_num_threads = 2
session = ort.InferenceSession(str(project / "backend/models/yamnet.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
scores = session.run(None, {session.get_inputs()[0].name: np.zeros(16000, dtype=np.float32)})[0]
assert scores.ndim == 2 and scores.shape[1] == 521 and np.isfinite(scores).all()

print("Loading cached Whisper base on the GPU and decoding synthetic silence...", flush=True)
model = whisper.load_model("base", device="cuda")
assert next(model.parameters()).device.type == "cuda"
tokenizer = whisper.tokenizer.get_tokenizer(multilingual=True, language="en", task="transcribe")
assert tokenizer.decode(tokenizer.encode("Clipperz local test")) == "Clipperz local test"
audio = whisper.pad_or_trim(np.zeros(16000, dtype=np.float32))
mel = whisper.log_mel_spectrogram(audio).to("cuda")
with torch.inference_mode():
    decoded = whisper.decode(model, mel, whisper.DecodingOptions(language="en", fp16=True, sample_len=1, without_timestamps=True))
assert np.isfinite(decoded.avg_logprob)

versions = {name: metadata.version(name) for name in ["pip", "setuptools", "wheel", "openai-whisper", "torch", "numpy", "numba", "llvmlite", "opencv-python-headless", "onnxruntime", "Pillow", "tiktoken", "python-dotenv", "questionary", "yt-dlp"]}
result = {
    "passed": True, "python": platform.python_version(), "executable": sys.executable,
    "isolatedEnvironment": True, "versions": versions,
    "cuda": {"available": True, "runtime": torch.version.cuda, "device": device.name, "vramBytes": device.total_memory, "matrixMultiplicationPassed": True},
    "numbaJitPassed": True, "opencvAndPillowPassed": True,
    "yunetLoadedAndRan": True, "yamnetOutputShape": list(scores.shape),
    "whisper": {"model": "base", "device": "cuda", "cachedModelLoaded": True, "tokenizerPassed": True, "syntheticOneTokenDecodePassed": True},
    "applicationStarted": False, "userMediaProcessed": False,
    "accuracyOrFullTranscriptionClaimed": False,
}
(root / "python-verification.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2), flush=True)
