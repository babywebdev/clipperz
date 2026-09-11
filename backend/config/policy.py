"""Installation policy shared by backend entry points and provider services."""
import os

STRICT_POLICY = "codex-then-claude"


def local_only() -> bool:
    return os.environ.get("PODCLI_LOCAL_ONLY") == "1"


def strict_ai() -> bool:
    return local_only() or os.environ.get("PODCLI_AI_PROVIDER", "").strip().lower() == STRICT_POLICY


class PolicyError(RuntimeError):
    pass


def require_external(feature: str) -> None:
    if local_only():
        raise PolicyError(f"{feature} is disabled in this local installation.")


def require_cloud() -> None:
    if strict_ai():
        raise PolicyError("Cloud services and direct AI APIs are disabled by the Codex → Claude policy.")


def validate_task(task_type: str, params: dict) -> None:
    if not local_only():
        return
    if task_type in {"manage_integrations", "run_integration_tool"} or (task_type == "manage_config" and params.get("action", "status") != "status"):
        raise PolicyError(f"{task_type} is disabled in this local installation.")
    if task_type == "manage_env" and params.get("action", "list") != "list":
        raise PolicyError("Installation settings are managed in the local profile.")
    if task_type == "transcribe":
        if params.get("engine") not in (None, "", "whisper-py"):
            raise PolicyError("This installation uses local whisper-py transcription.")
        params["engine"] = "whisper-py"
        params["enable_diarization"] = False
        if params.get("model_size", "base") != "base":
            raise PolicyError("Only the installed Whisper base model is enabled.")
    def inspect(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in {"url", "video_url", "source_url"} and item:
                    raise PolicyError("Remote media downloads are disabled; select a local file.")
                if key in {"file_path", "video_path", "audio_path", "logo_path", "intro_path", "outro_path", "image_path"} and isinstance(item, str):
                    if "://" in item or item.startswith(("\\\\", "//")):
                        raise PolicyError("Media must use a local filesystem path.")
                inspect(item)
        elif isinstance(value, list):
            for item in value:
                inspect(item)
    inspect(params)


_guard_installed = False


def install_network_guard() -> None:
    global _guard_installed
    if not local_only() or _guard_installed:
        return
    import sys
    def guard(event, args):
        if event == "socket.getaddrinfo":
            host = args[0]
        elif event == "socket.connect" and isinstance(args[1], tuple):
            host = args[1][0]
        else:
            return
        if host not in {"localhost", "127.0.0.1", "::1", b"localhost", b"127.0.0.1", b"::1"}:
            raise PolicyError("External network requests are disabled in the local backend.")
    sys.addaudithook(guard)
    _guard_installed = True
