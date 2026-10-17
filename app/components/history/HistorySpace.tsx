import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";
import type { HistorySpacePage } from "@/lib/history/types";
import "./history.css";

export default function HistorySpace({ record, locale = "en" }: { record: HistorySpacePage; locale?: HistoryLocale }) {
  const copy = historyCopy(locale);
  const place = [record.city, record.country].filter(Boolean).join(", ");
  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap">
        <p className="rh-kicker">{copy.spaceWord}</p>
        <h1 className="rh-title">{record.name}</h1>
        <p>{place || copy.locationNotRecorded}</p>
        <p>{copy.documentedLine(record.exhibitions.length)}</p>
        {record.exhibitions.length === 0 ? <p>{copy.noExhibitions}</p> : null}
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
