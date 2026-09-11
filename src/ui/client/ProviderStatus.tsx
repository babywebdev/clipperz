import React, { createContext, useEffect, useState } from "react";
export const LocalPolicyContext = createContext(false);

type State = { localOnly: boolean; strict: boolean; lastAI?: {
  task_id: string; status: string; provider: string; label: string;
  fallback_reason: string; attempts: string[];
} };

export default function ProviderStatus({ onPolicy }: { onPolicy: (local: boolean) => void }) {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => fetch("/api/local-policy").then(res => res.json()).then(data => {
      if (active) { setState(data); onPolicy(data.localOnly); }
    }).catch(() => {});
    void refresh();
    const timer = setInterval(refresh, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [onPolicy]);
  if (!state?.strict) return null;
  const ai = state.lastAI;
  return <div className="card" style={{ margin: "16px 24px 0", padding: "12px 16px" }} aria-live="polite">
    <strong>{ai ? ai.label : "AI: Codex → Claude fallback → stop"}</strong>
    <div className="hint">Media processing stays local. AI requests send the supplied text to the official clients’ remote models.</div>
    {ai?.status === "failed" && <div role="alert">{ai.attempts.join("; ")}</div>}
    {ai?.status === "running" && <button className="btn btn-ghost btn-sm" onClick={() => {
      void fetch("/api/ai/cancel", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: ai.task_id }) });
    }}>Cancel AI request</button>}
  </div>;
}
