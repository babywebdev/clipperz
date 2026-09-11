import { afterEach, expect, it, vi } from "vitest";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createServer } from "./server.js";
import { localMcpTools } from "./config/policy.js";
import { PythonExecutor } from "./services/python-executor.js";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("advertises only allowed local tools and rejects disabled calls", async () => {
  vi.stubEnv("PODCLI_LOCAL_ONLY", "1");
  const server = createServer();
  const client = new Client({ name: "offline-policy-test", version: "1" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.listTools();
    expect(result.tools.map(tool => tool.name).sort()).toEqual([...localMcpTools].sort());
    const blocked = await client.callTool({ name: "manage_assets", arguments: { action: "list" } });
    expect(blocked.isError).toBe(true);
    const remote = await client.callTool({ name: "transcribe_podcast", arguments: { file_path: "https://example.com/video.mp4" } });
    expect(remote.isError).toBe(true);
  } finally { await client.close(); await server.close(); }
});

it("accepts agent-supplied suggestions without a nested AI request", async () => {
  vi.stubEnv("PODCLI_LOCAL_ONLY", "1");
  const execute = vi.spyOn(PythonExecutor.prototype, "execute");
  const server = createServer();
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  const client = new Client({ name: "supplied-suggestions-test", version: "1" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: "suggest_clips", arguments: { suggestions: [{
      title: "A quieter recording room", start_second: 0, end_second: 45,
      payoff: "You learn how moving the microphone can reduce background noise.",
      standalone: "nothing", reasoning: "Practical advice with a clear demonstration.",
      preview_text: "A microphone close to your mouth picks up less room noise.",
    }] } });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.content)).toContain("A quieter recording room");
    const posted = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(posted.suggestions).toHaveLength(1);
    expect(posted.suggestions[0].duration).toBe(45);
    execute.mock.calls.forEach(call => expect(call[0]).not.toMatch(/suggest|generate|find_moment/));
    expect(execute).not.toHaveBeenCalled();
  } finally { await client.close(); await server.close(); }
});
