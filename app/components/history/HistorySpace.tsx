import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import type { HistorySpacePage } from "@/lib/history/types";
import "./history.css";

export default function HistorySpace({ record }: { record: HistorySpacePage }) {
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <p className="rh-kicker">Space</p>
        <h1 className="rh-title">{record.name}</h1>
        <p>{[record.city, record.country].filter(Boolean).join(", ") || "Location not recorded"}</p>
        <p>{record.exhibitions.length} documented exhibitions</p>
        {record.exhibitions.length === 0 ? <p>No documented exhibitions yet.</p> : null}
        <ol className="rh-list">
          {record.exhibitions.map((exhibition) => (
            <li key={exhibition.id}>
              <span>{exhibition.dateLabel}</span>{" "}
              {exhibition.slug ? <Link href={`/exhibitions/${exhibition.slug}`}>{exhibition.title}</Link> : exhibition.title}
              <div>
                {exhibition.artists.map((artist) => (
                  <Link key={artist.id} href={`/artists/${artist.slug}`}>
                    {artist.name}{" "}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
