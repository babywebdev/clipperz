"""Inspect wheel metadata and interpreter startup hooks without importing packages."""
import hashlib
import json
import zipfile
from email.parser import BytesParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

project = Path(__file__).resolve().parents[2]
root = project / "_local/installation"
root.mkdir(parents=True, exist_ok=True)
wheelhouse = root.parent / "clipperz/data/cache/wheels"
report = json.loads((project / "config/windows/wheels.json").read_text(encoding="utf-8"))
inventory = []
for item in report["install"]:
    filename = unquote(PurePosixPath(urlsplit(item["download_info"]["url"]).path).name)
    path = wheelhouse / filename
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    assert digest == item["download_info"]["archive_info"]["hashes"]["sha256"], filename
    with zipfile.ZipFile(path) as wheel:
        names = wheel.namelist()
        assert all(not PurePosixPath(name).is_absolute() and ".." not in PurePosixPath(name).parts and "\\" not in name and ":" not in name for name in names)
        metadata_name, = [name for name in names if name.endswith(".dist-info/METADATA") and name.count("/") == 1]
        metadata = BytesParser().parsebytes(wheel.read(metadata_name))
        assert metadata["Version"] == item["metadata"]["version"]
        hooks = {name: wheel.read(name).decode("utf-8") for name in names if name.endswith(".pth") or name in {"sitecustomize.py", "usercustomize.py"}}
        entry = {"file": filename, "name": metadata["Name"], "version": metadata["Version"], "sha256": digest, "bytes": path.stat().st_size, "startupHooks": hooks}
        inventory.append(entry)
        if hooks:
            print(json.dumps({"package": metadata["Name"], "startupHooks": hooks}))
(root / "wheel-inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")
print(json.dumps({"verifiedWheels": len(inventory), "totalBytes": sum(item["bytes"] for item in inventory)}))
