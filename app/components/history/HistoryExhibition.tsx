import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import type { HistoryExhibitionPage } from "@/lib/history/types";
import ReportIssue from "@/app/components/history/ReportIssue";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";
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
            {record.spaceSlug ? <Link href={`/spaces/${record.spaceSlug}`}>{record.spaceName}</Link> : record.spaceName}
            {record.city || record.country ? ` · ${[record.city, record.country].filter(Boolean).join(" · ")}` : ""}
          </p>
        ) : null}
        <h2>{copy.artistsHeading}</h2>
        <ul className="rh-list">
          {record.artists.map((artist) => (
            <li key={artist.id}>
              <Link href={`/artists/${artist.slug}`}>{artist.name}</Link>
              {artist.nativeName ? ` ${artist.nativeName}` : ""}
            </li>
          ))}
          {record.unresolved.map((name) => (
            <li key={name.label}>{name.label} · {name.status === "REVIEW_REQUIRED" ? copy.reviewRequired : name.status === "TITLE_MENTION" ? copy.namedInTitle : copy.unresolvedParticipant}</li>
          ))}
        </ul>
        {record.curatorName ? <p>{copy.curatorLabel}: {record.curatorName}</p> : null}
        <details>
          <summary>{copy.source}: {record.provenance}</summary>
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
