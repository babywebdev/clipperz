/** Explicit installation controls; upstream defaults remain available outside this profile. */
export const localOnly = (): boolean => process.env.PODCLI_LOCAL_ONLY === "1";
export const strictAI = (): boolean => localOnly() || process.env.PODCLI_AI_PROVIDER === "codex-then-claude";

export function requireCloud(): void {
  if (strictAI()) throw new Error("Cloud services are disabled by the Codex → Claude policy.");
}

export function localRequestError(method: string, path: string, body: unknown): string | null {
  if (!localOnly()) return null;
  if (/^\/api\/(download-video|assets\/url|youtube(?:\/|$)|analytics|thumbnail-studio|thumbnail-config|knowledge\/init)/.test(path)
      || /^\/api\/clips\/[^/]+\/(thumbnail|davinci)/.test(path)
      || (path === "/api/settings" && method !== "GET")) {
    return "This feature is disabled in the local installation.";
  }
  const inspect = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(inspect);
    if (value && typeof value === "object") return Object.entries(value).some(([key, item]) => {
      if (["url", "video_url", "source_url"].includes(key) && item) return true;
      if (/^(file_path|video_path|audio_path|logo_path|intro_path|outro_path|image_path|videoPath|filePath|logoPath|introPath|outroPath)$/.test(key)
          && typeof item === "string" && (item.includes("://") || item.startsWith("\\\\") || item.startsWith("//"))) return true;
      if (key === "engine" && item && item !== "whisper-py") return true;
      return inspect(item);
    });
    return false;
  };
  return inspect(body) ? "Use local media files and the whisper-py transcription engine." : null;
}

let networkGuardInstalled = false;
export function installLocalNetworkGuard(): void {
  if (!localOnly() || networkGuardInstalled) return;
  networkGuardInstalled = true;
  const fetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
      return Promise.reject(new Error("External network requests are disabled in the local installation."));
    }
    return fetch(input, { ...init, redirect: "error" });
  };
}

export const localMcpTools = new Set([
  "transcribe_podcast", "transcribe_start", "job_status", "suggest_clips",
  "create_clip", "batch_create_clips", "get_ui_state", "modify_clip", "toggle_clip",
  "update_settings", "list_outputs", "set_video", "import_transcript", "parse_transcript",
]);
