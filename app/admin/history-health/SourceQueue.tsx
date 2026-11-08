"use client";

import { useEffect, useState } from "react";
import type { SubmittedSourceQueueRow } from "@/lib/history/sourceReview";

export default function SubmittedSourceQueue() {
  const [rows, setRows] = useState<SubmittedSourceQueueRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/history/sources?status=REVIEW_REQUIRED")
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "The source queue could not be loaded.");
        if (active) setRows(body.sources ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "The source queue could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    setError("");
    const response = await fetch(`/api/admin/history/sources/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error || "The source decision was not saved.");
      return;
    }
    setRows((current) => (current ?? []).filter((row) => row.id !== id));
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ fontSize: 18 }}>Submitted source queue</h2>
      <p style={{ color: "#526072", fontSize: 14, lineHeight: 1.5 }}>
        작가 기록과 외부 출처는 따로 검토합니다. 주소를 직접 연 뒤에만 승인하세요. 승인해도 등록 주체는 바뀌지 않습니다.
      </p>
      {error ? <p style={{ color: "#9f1239" }}>{error}</p> : null}
      {rows === null ? <p>Loading sources…</p> : null}
      {rows?.length === 0 ? <p>No submitted sources are waiting.</p> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {rows?.map((row) => (
          <article key={row.id} style={{ border: "1px solid #d7dee7", borderRadius: 12, padding: 14, display: "grid", gap: 6 }}>
            <strong>{row.exhibitionTitle}</strong>
            <span>{row.exhibitionSlug || "No slug"} · {row.artists.join(", ") || "No linked artist"}</span>
            <span>Origin {row.origin || "—"} · {row.contributorKind || "—"} · {row.publicationStatus || "—"}</span>
            <span>{row.sourceType} · {row.clearanceStatus} · {row.hostname} · {new Date(row.submittedAt).toLocaleString("ko-KR")}</span>
            <a href={row.url} target="_blank" rel="noreferrer">{row.url}</a>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => review(row.id, "APPROVED")}>Approve source</button>
              <button type="button" onClick={() => review(row.id, "REJECTED")}>Reject source</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
