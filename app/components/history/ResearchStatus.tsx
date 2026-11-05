"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { pushRobEvent } from "@/lib/publicGrowth/analytics";
import { usePublicHref } from "@/app/components/history/LocaleUrl";
import type { ResearchFactView, ResearchPublicView } from "@/lib/history/researchJob";
import "./history.css";

const MARK = { done: "✓", current: "●", waiting: "○" } as const;
const POLL_MS = 2500;

function exhibitionCount(count: number, locale: ResearchPublicView["locale"]) {
  if (locale === "ko") return `확인된 전시 ${count}건`;
  return count === 1 ? "1 documented exhibition" : `${count} documented exhibitions`;
}

function sourceLabel(fact: ResearchFactView, locale: ResearchPublicView["locale"]) {
  if (/kukjegallery\.com\/artists\/view/i.test(fact.sourceUrl)) {
    return locale === "ko" ? "Kukje Gallery · 공식 연보" : "Kukje Gallery · Official artist chronology";
  }
  return fact.sourceName;
}

export default function ResearchStatus({ initial }: { initial: ResearchPublicView }) {
  const publicHref = usePublicHref();
  const [job, setJob] = useState(initial);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (job.stage === "DONE") return;
    let cancelled = false;
    let timer = 0;

    async function pull() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/history/research/${job.id}`);
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data?.job) {
          if (data?.unavailable) setUnavailable(true);
          return;
        }
        setUnavailable(false);
        setJob(data.job as ResearchPublicView);
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      if (cancelled || document.visibilityState === "hidden") return;
      timer = window.setTimeout(() => {
        void pull().finally(schedule);
      }, POLL_MS);
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        void pull();
        schedule();
      } else {
        window.clearTimeout(timer);
      }
    }

    void pull();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [job.id, job.stage]);

  const hasFacts = job.verifiedFactCount > 0 && job.facts.length > 0;
  const complete = job.status === "HISTORY_READY";

  return (
    <div className="rh-page">
      <TopBar locale={job.locale} />
      <main className="rh-wrap rh-research" id="main-content">
        <p className="rh-kicker">ROB</p>
        <h1 className="rh-title rh-research-title">{job.query}</h1>
        {hasFacts ? (
          <>
            <p className="rh-lead">{exhibitionCount(job.verifiedFactCount, job.locale)}</p>
            <section className="rh-world" aria-label={job.locale === "ko" ? "확인된 전시" : "Documented exhibitions"}>
              <h2 className="rh-kicker">{job.locale === "ko" ? "확인된 전시" : "Documented exhibitions"}</h2>
              <ul className="rh-results">
                {job.facts.map((fact) => (
                  <li key={fact.pilotRecordId} className="rh-enter">
                    <div className="rh-result-link">
                      <span className="rh-result-name">
                        <strong>{fact.title}</strong>
                        {fact.year ? <span>{fact.year}</span> : null}
                      </span>
                      <span className="rh-result-meta">
                        <span>{[fact.venue, fact.city, fact.country].filter(Boolean).join(" · ")}</span>
                        <a className="rh-source" href={fact.sourceUrl}>{sourceLabel(fact, job.locale)}</a>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            {complete ? <p className="rh-lead" role="status">✓ {job.detail}</p> : <p className="rh-prose" role="status">{job.detail}</p>}
          </>
        ) : (
          <>
            <p className="rh-lead" role="status" aria-live="polite">{job.headline}</p>
            <p className="rh-prose">{job.detail}</p>
          </>
        )}
        <ol className="rh-steps">
          {job.steps.map((step) => (
            <li key={step.id} data-state={step.state}>
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
        {job.resultHref ? (
          <p className="rh-cta">
            <Link
              className="rh-button"
              href={publicHref(job.resultHref)}
              onClick={() => pushRobEvent("DISCOVERY_RESULT_OPENED", { route: "/research" })}
            >
              {job.locale === "ko" ? "이 작가의 세계 보기" : "Enter this artist world"}
            </Link>
          </p>
        ) : null}
        {unavailable ? <p>{job.locale === "ko" ? "이 주소로 다시 돌아오면 저장된 기록을 볼 수 있습니다." : "This address keeps the saved record."}</p> : null}
      </main>
    </div>
  );
}
