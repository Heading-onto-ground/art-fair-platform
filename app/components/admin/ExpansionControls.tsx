"use client";

import { useState } from "react";

/**
 * Authorized operator batch. The form can only ask for a small count.
 * It cannot submit a URL, a host, a crawl depth, or a SQL statement.
 */
export default function ExpansionControls({ enabled, dailyLimit, paused }: { enabled: boolean; dailyLimit: number; paused: string | null }) {
  const max = Math.max(1, Math.min(10, dailyLimit));
  const [limit, setLimit] = useState(Math.min(3, max));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runBatch() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/history/expansion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "RUN", limit }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(typeof body?.error === "string" ? body.error : "The batch did not start.");
        return;
      }
      const started = body?.run?.jobsStarted ?? 0;
      setMessage(`Batch finished. Research jobs started: ${started}.`);
    } catch {
      setMessage("The batch did not start.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Authorized batch</h2>
      <p>
        The daily cron is {enabled ? "enabled" : "off"} and creates research jobs only when ROB_EXPANSION_ENABLED is true. This form runs one bounded batch on the same engine.
        It cannot name a URL, a host, or a crawl depth.
      </p>
      {paused ? <p>AUTONOMOUS_EXPANSION_PAUSED · {paused}. The batch stays paused with the circuit breaker.</p> : null}
      <label>
        Artists in this batch{" "}
        <input
          type="number"
          min={1}
          max={max}
          value={limit}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            setLimit(Number.isFinite(next) ? Math.max(1, Math.min(max, next)) : 1);
          }}
        />
      </label>{" "}
      <button type="button" disabled={pending || Boolean(paused)} onClick={runBatch}>
        {pending ? "Running" : "Run this batch"}
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
