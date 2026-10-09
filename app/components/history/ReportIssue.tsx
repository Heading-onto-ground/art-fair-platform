"use client";

import { useState } from "react";
import { trackHistory } from "@/lib/history/analytics";

const KINDS = [
  ["incorrect", "Incorrect information"],
  ["identity", "Identity mismatch"],
  ["date", "Date or location issue"],
  ["removal", "Removal request"],
  ["source", "Source issue"],
] as const;

export default function ReportIssue({ exhibitionId, artistSlug }: { exhibitionId?: string; artistSlug?: string }) {
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("incorrect");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    trackHistory("REPORT_ISSUE_STARTED");
    const response = await fetch("/api/history/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exhibitionId, artistSlug, kind, note }),
    });
    setState(response.ok ? "sent" : "error");
  }

  if (state === "sent") return <p>Report received. It is not shown publicly.</p>;

  return (
    <form onSubmit={submit}>
      <p>
        <button className="rh-text-button" type="button" onClick={() => trackHistory("REPORT_ISSUE_STARTED")}>
          Report an issue
        </button>
      </p>
      <label>
        Issue
        <select aria-label="Issue kind" value={kind} onChange={(event) => setKind(event.target.value as (typeof KINDS)[number][0])}>
          {KINDS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <textarea aria-label="Issue note" value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} required />
      <button type="submit">Send report</button>
      {state === "error" ? <p>The report could not be sent.</p> : null}
    </form>
  );
}
