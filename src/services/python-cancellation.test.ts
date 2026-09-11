import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("child_process", () => ({ spawn: mocks.spawn }));
import { PythonExecutor, aiEvents, cancelAIRequest } from "./python-executor.js";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); mocks.spawn.mockReset(); aiEvents.removeAllListeners(); });
describe("AI task cancellation", () => {
  it("writes cancellation before terminating the process tree and never retries", async () => {
    const proc = Object.assign(new EventEmitter(), {
      pid: 4242, exitCode: null, signalCode: null, kill: vi.fn(),
      stdin: Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() }),
      stdout: new EventEmitter(), stderr: new EventEmitter(),
    });
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    let cancelFile = "";
    mocks.spawn.mockImplementation((_command, _args, options) => {
      if (!cancelFile) { cancelFile = options.env.PODCLI_CANCEL_FILE; return proc; }
      expect(readFileSync(cancelFile, "utf8")).toContain("cancelled");
      return new EventEmitter(); // taskkill must be mocked, never a real PID
    });
    const result = new PythonExecutor().execute("generate_custom", {});
    const updates = vi.fn(); aiEvents.on("update", updates);
    const rejected = expect(result).rejects.toThrow("cancelled");
    const task = JSON.parse(proc.stdin.write.mock.calls[0][0]);
    expect(cancelAIRequest(task.task_id)).toBe(true);
    await rejected;
    expect(existsSync(cancelFile)).toBe(true);
    expect(cancelAIRequest(task.task_id)).toBe(false);
    proc.stderr.emit("data", Buffer.from(JSON.stringify({ task_id: task.task_id, ai: { status: "running", provider: "claude" } }) + "\n"));
    expect(updates).toHaveBeenCalledTimes(1);
    expect(updates.mock.calls[0][0].status).toBe("cancelled");
    proc.emit("close", 1);
    expect(existsSync(cancelFile)).toBe(false);
    expect(mocks.spawn.mock.calls.filter(call => call[0] !== "taskkill")).toHaveLength(1);
    kill.mockRestore();
  });
  it("does not launch a request already cancelled by the caller", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(new PythonExecutor().execute("generate_custom", {}, undefined, controller.signal)).rejects.toThrow("cancelled");
    expect(mocks.spawn).not.toHaveBeenCalled();
  });
  it("marks a timed-out AI task before killing it and reports failure", async () => {
    vi.useFakeTimers();
    vi.spyOn(process, "kill").mockReturnValue(true);
    const proc = Object.assign(new EventEmitter(), {
      pid: 4242, exitCode: null, signalCode: null,
      stdin: Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() }),
      stdout: new EventEmitter(), stderr: new EventEmitter(),
    });
    let cancelFile = "";
    mocks.spawn.mockImplementation((_command, _args, options) => {
      if (!cancelFile) { cancelFile = options.env.PODCLI_CANCEL_FILE; return proc; }
      expect(readFileSync(cancelFile, "utf8")).toContain("cancelled");
      return new EventEmitter();
    });
    const updates = vi.fn(); aiEvents.on("update", updates);
    const result = new PythonExecutor(100).execute("generate_custom", {});
    const rejected = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(readFileSync(cancelFile, "utf8")).toContain("cancelled");
    expect(updates.mock.calls.at(-1)?.[0].status).toBe("failed");
    proc.emit("close", 1);
    expect(existsSync(cancelFile)).toBe(false);
  });
});
