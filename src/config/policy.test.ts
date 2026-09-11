import { afterEach, describe, expect, it, vi } from "vitest";
import { localRequestError, strictAI, localMcpTools } from "./policy.js";
import { readToken, uploadClipVideo } from "../services/podcli-cloud.js";

afterEach(() => vi.unstubAllEnvs());
describe("local installation policy", () => {
  it("ignores cloud settings and stored-token environment variables", async () => {
    vi.stubEnv("PODCLI_LOCAL_ONLY", "1");
    vi.stubEnv("PODCLI_AI_PROVIDER", "cloud");
    vi.stubEnv("PODCLI_TOKEN", "test-token-never-send");
    expect(strictAI()).toBe(true);
    expect(await readToken()).toBeNull();
    expect(await uploadClipVideo("id", "does-not-exist.mp4")).toBe(false);
  });
  it("blocks disabled endpoints and remote media before work begins", () => {
    vi.stubEnv("PODCLI_LOCAL_ONLY", "1");
    for (const path of ["/api/download-video", "/api/assets/url", "/api/youtube/sync", "/api/settings", "/api/thumbnail-studio/render", "/api/clips/id/thumbnail"]) {
      expect(localRequestError("POST", path, {})).toMatch(/disabled/);
    }
    for (const value of ["https://example.com/video.mp4", "\\\\server\\share\\video.mp4", "//server/share/video.mp4"]) {
      expect(localRequestError("POST", "/api/select-file", { file_path: value })).toBeTruthy();
    }
    expect(localRequestError("POST", "/api/transcribe", { engine: "assemblyai" })).toBeTruthy();
  });
  it("keeps local files and transcript text usable", () => {
    vi.stubEnv("PODCLI_LOCAL_ONLY", "1");
    expect(localRequestError("POST", "/api/select-file", { file_path: "C:/My Videos/source.mp4" })).toBeNull();
    expect(localRequestError("POST", "/api/content-studio/custom", { transcript_text: "A quote about https://example.com" })).toBeNull();
    expect(localRequestError("GET", "/api/settings", {})).toBeNull();
  });
  it("restricts MCP to the initial local editing workflow", () => {
    for (const name of ["transcribe_podcast", "suggest_clips", "create_clip", "batch_create_clips", "get_ui_state"]) expect(localMcpTools.has(name)).toBe(true);
    for (const name of ["manage_assets", "knowledge_base", "manage_thumbnail_config", "publish", "youtube_upload"]) expect(localMcpTools.has(name)).toBe(false);
  });
});
