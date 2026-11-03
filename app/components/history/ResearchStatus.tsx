"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { pushRobEvent } from "@/lib/publicGrowth/analytics";
import type { ResearchPublicView } from "@/lib/history/researchJob";
import "./history.css";

const MARK = { done: "✓", current: "●", waiting: "○" } as const;

export default function ResearchStatus({ initial }: { initial: ResearchPublicView }) {
  const [job, setJob] = useState(initial);
  const [unavailable, setUnavailable] = useState(false);
  const runs = useRef(0);
  const announced = useRef(initial.headline);

  useEffect(() => {
    if (job.stage === "DONE") return;
    if (runs.current >= 12) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        runs.current += 1;
        try {
          const response = await fetch(`/api/history/research/${job.id}/continue`, { method: "POST" });
          const data = await response.json().catch(() => null);
          if (cancelled) return;
          if (!response.ok || !data?.job) {
            if (data?.unavailable) setUnavailable(true);
            return;
          }
          setJob(data.job as ResearchPublicView);
          if (data.job.headline !== announced.current) announced.current = data.job.headline;
        } catch {
          if (!cancelled) setUnavailable(true);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [job]);

  return (
    <div className="rh-page">
      <TopBar locale={job.locale} />
      <main className="rh-wrap rh-research" id="main-content">
        <p className="rh-kicker">ROB</p>
        <h1 className="rh-title rh-research-title">{job.query}</h1>
        <p className="rh-lead" role="status" aria-live="polite">{job.headline}</p>
        <p className="rh-prose">{job.detail}</p>
        <ol className="rh-steps">
          {job.steps.map((step) => (
            <li key={step.id} className="rh-enter" data-state={step.state}>
              <span aria-hidden="true">{MARK[step.state]}</span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
        <p className="rh-muted">
          {job.locale === "ko"
            ? `공식 출처 ${job.sourcesFound}곳 · 확인된 기록 ${job.verifiedFactCount}건 · 검토 ${job.reviewFactCount}건`
            : `${job.sourcesFound} official sources · ${job.verifiedFactCount} verified records · ${job.reviewFactCount} in review`}
        </p>
        {job.facts.length > 0 ? (
          <ul className="rh-results rh-enter">
            {job.facts.map((fact) => (
              <li key={fact.pilotRecordId}>
                <div className="rh-result-link">
                  <span className="rh-result-name">
                    <strong>{fact.title}</strong>
                    {fact.year ? <span>{fact.year}</span> : null}
                  </span>
                  <span className="rh-result-meta">
                    <span>{[fact.venue, fact.city, fact.country].filter(Boolean).join(" · ")}</span>
                    <a href={fact.sourceUrl}>{fact.sourceName}</a>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {job.resultHref ? (
          <p className="rh-cta">
            <Link
              className="rh-button"
              href={job.resultHref}
              onClick={() => pushRobEvent("DISCOVERY_RESULT_OPENED", { route: "/research" })}
            >
              {job.locale === "ko" ? "이 작가의 세계 보기" : "Enter this artist world"}
            </Link>
          </p>
        ) : null}
        {unavailable ? <p>{job.locale === "ko" ? "조사를 잠시 이어갈 수 없습니다. 이 주소로 다시 돌아오면 이어서 확인합니다." : "Research cannot continue right now. This address keeps the record."}</p> : null}
      </main>
    </div>
  );
}
