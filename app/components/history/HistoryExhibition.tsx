import Link from "next/link";
import JourneyContinueLink from "@/app/components/history/JourneyContinueLink";
import TopBar from "@/app/components/TopBar";
import type { HistoryExhibitionPage } from "@/lib/history/types";
import ReportIssue from "@/app/components/history/ReportIssue";
import { historyCopy, historyOriginLabel, type HistoryLocale } from "@/lib/history/locale";
import { artistDisplayNames } from "@/lib/history/names";
import { pinnedPath } from "@/lib/history/requestLocale";
import "./history.css";

export default function HistoryExhibition({ record, locale = "en" }: { record: HistoryExhibitionPage; locale?: HistoryLocale }) {
  const copy = historyCopy(locale);
  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap">
        <h1 className="rh-title">{record.title}</h1>
        <p>{record.dateLabel}{record.endLabel ? ` – ${record.endLabel}` : ""}</p>
        {record.spaceName ? (
          <p>
            {record.spaceSlug ? <Link href={pinnedPath(`/spaces/${record.spaceSlug}`)}>{record.spaceName}</Link> : record.spaceName}
            {record.city || record.country ? ` · ${[record.city, record.country].filter(Boolean).join(" · ")}` : ""}
          </p>
        ) : null}
        <h2>{copy.artistsHeading}</h2>
        <ul className="rh-list">
          {record.artists.map((artist) => {
            const names = artistDisplayNames({ canonicalName: artist.name, nativeName: artist.nativeName, locale });
            return (
              <li key={artist.id}>
                <JourneyContinueLink slug={artist.slug}>{names.primary}</JourneyContinueLink>
                {names.secondary ? <span className="rh-name-secondary">{names.secondary}</span> : null}
              </li>
            );
          })}
          {record.unresolved.map((name) => (
            <li key={name.label}>{name.label} · {name.status === "REVIEW_REQUIRED" ? copy.reviewRequired : name.status === "TITLE_MENTION" ? copy.namedInTitle : copy.unresolvedParticipant}</li>
          ))}
        </ul>
        {record.curatorName ? <p>{copy.curatorLabel}: {record.curatorName}</p> : null}
        <p className="rh-origin">{copy.originHeading}: {historyOriginLabel(locale, record.origin)}</p>
        <details>
          <summary>{copy.source}</summary>
          {record.sources.length === 0 ? <p>{copy.noSource}</p> : null}
          {record.sources.map((source) => (
            <p key={source.id}><a href={source.url}>{source.sourceName}</a></p>
          ))}
          <ReportIssue exhibitionId={record.id} />
        </details>
      </main>
    </div>
  );
}
