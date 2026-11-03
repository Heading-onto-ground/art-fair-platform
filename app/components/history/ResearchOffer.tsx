"use client";

import { useState } from "react";
import { pushRobEvent } from "@/lib/publicGrowth/analytics";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";

export default function ResearchOffer({
  query,
  locale,
  expand = false,
}: {
  query: string;
  locale: HistoryLocale;
  expand?: boolean;
}) {
  const copy = historyCopy(locale);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    const name = query.trim();
    if (!name || pending) return;
    setPending(true);
    setFailed(false);
    pushRobEvent("DISCOVERY_REQUESTED", { route: expand ? "artist" : "search" });
    try {
      const response = await fetch("/api/history/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: name, expand }),
      });
      const data = await response.json().catch(() => null);
      if (data?.artistHref && !data.job) {
        window.location.assign(data.artistHref);
        return;
      }
      if (data?.job?.id) {
        window.location.assign(`/research/${data.job.id}`);
        return;
      }
      setFailed(true);
      setPending(false);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="rh-research-offer">
      <p>{expand ? copy.researchExpand : copy.researchOffer}</p>
      <button className="rh-button" type="button" onClick={() => void start()} disabled={pending} aria-busy={pending}>
        {copy.researchAction}
      </button>
      {failed ? <p>{copy.searchError}</p> : null}
    </div>
  );
}
