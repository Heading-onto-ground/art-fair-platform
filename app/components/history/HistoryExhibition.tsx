import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import type { HistoryExhibitionPage } from "@/lib/history/types";
import "./history.css";

export default function HistoryExhibition({ record }: { record: HistoryExhibitionPage }) {
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <h1 className="rh-title">{record.title}</h1>
        <p>{record.dateLabel}{record.endLabel ? ` – ${record.endLabel}` : ""}</p>
        {record.spaceName ? (
          <p>
            {record.spaceSlug ? <Link href={`/spaces/${record.spaceSlug}`}>{record.spaceName}</Link> : record.spaceName}
            {record.city || record.country ? ` · ${[record.city, record.country].filter(Boolean).join(" · ")}` : ""}
          </p>
        ) : null}
        <h2>Artists</h2>
        <ul className="rh-list">
          {record.artists.map((artist) => (
            <li key={artist.id}>
              <Link href={`/artists/${artist.slug}`}>{artist.name}</Link>
              {artist.nativeName ? ` ${artist.nativeName}` : ""}
            </li>
          ))}
          {record.unresolved.map((name) => (
            <li key={name.label}>{name.label} · {name.status === "REVIEW_REQUIRED" ? "Review required" : "Unresolved participant"}</li>
          ))}
        </ul>
        {record.curatorName ? <p>Curator: {record.curatorName}</p> : null}
        <details>
          <summary>{record.provenance}</summary>
          {record.sources.length === 0 ? <p>No approved source is attached.</p> : null}
          {record.sources.map((source) => (
            <p key={source.id}><a href={source.url}>{source.sourceName}</a></p>
          ))}
        </details>
      </main>
    </div>
  );
}
