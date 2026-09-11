"""Fetch public metadata and Whisper source for inspection; execute no package code."""
import hashlib
import io
import json
import tarfile
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

project = Path(__file__).resolve().parents[2]
root = project / "_local/installation"
root.mkdir(parents=True, exist_ok=True)
sources = root / "sources"
sources.mkdir(exist_ok=True)
allowed = {"pypi.org", "files.pythonhosted.org", "download.pytorch.org", "download-r2.pytorch.org"}

def get(url):
    assert urllib.parse.urlsplit(url).hostname in allowed, url
    with urllib.request.urlopen(url, timeout=60) as response:
        assert urllib.parse.urlsplit(response.url).hostname in allowed, response.url
        return response.read()

metadata = json.loads(get("https://pypi.org/pypi/openai-whisper/20250625/json"))
(sources / "whisper-pypi.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
sdist = next(item for item in metadata["urls"] if item["packagetype"] == "sdist")
assert not sdist["yanked"]
expected = "37a91a3921809d9f44748ffc73c0a55c9f366c85a3ef5c2ae0cc09540432eb96"
assert sdist["digests"]["sha256"] == expected
archive = get(sdist["url"])
assert len(archive) == sdist["size"] == 803191
assert hashlib.sha256(archive).hexdigest() == expected
(sources / sdist["filename"]).write_bytes(archive)
with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
    names = tar.getnames()
    print(json.dumps({"whisperArchive": sdist["filename"], "sha256": expected, "members": len(names)}))
    for member in tar.getmembers():
        parts = Path(member.name).parts
        assert not Path(member.name).is_absolute() and ".." not in parts
        assert member.isdir() or member.isfile(), member.name
    (sources / "whisper-archive-members.json").write_text(json.dumps(names, indent=2), encoding="utf-8")
    for suffix in ["pyproject.toml", "setup.py", "setup.cfg", "MANIFEST.in", "whisper/version.py", "whisper/__init__.py"]:
        matches = [name for name in names if name.split("/", 1)[-1] == suffix]
        for name in matches:
            content = tar.extractfile(name).read().decode("utf-8")
            (sources / suffix.replace("/", "-")).write_text(content, encoding="utf-8")
            print(json.dumps({"file": suffix, "content": content}))

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href", "")
            if "torch-2.14.0+cu126-cp314-cp314-win_amd64.whl" in urllib.parse.unquote(href):
                self.urls.append(urllib.parse.urljoin("https://download.pytorch.org/whl/cu126/torch/", href))

index = get("https://download.pytorch.org/whl/cu126/torch/").decode("utf-8")
(sources / "torch-cu126-index.html").write_text(index, encoding="utf-8")
links = Links()
links.feed(index)
assert len(links.urls) == 1, links.urls
torch_url = links.urls[0]
assert urllib.parse.urlsplit(torch_url).hostname in allowed
assert "#sha256=" in torch_url
(sources / "torch-selection.json").write_text(json.dumps({"url": torch_url, "version": "2.14.0+cu126", "python": "cp314", "platform": "win_amd64"}, indent=2), encoding="utf-8")
print(json.dumps({"torch": torch_url}))
for name in ["setuptools", "wheel"]:
    package = json.loads(get(f"https://pypi.org/pypi/{name}/json"))
    (sources / f"{name}-pypi.json").write_text(json.dumps(package, indent=2), encoding="utf-8")
    print(json.dumps({"buildDependency": name, "version": package["info"]["version"], "requiresDist": package["info"]["requires_dist"]}))
