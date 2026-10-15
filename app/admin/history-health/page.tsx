import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { loadHistoryHealth } from "@/lib/history/health";
import { isMissingHistorySchema } from "@/lib/history/schemaError";

export const dynamic = "force-dynamic";

export default async function HistoryHealthPage() {
  if (!getAdminSession()) redirect("/admin/login");
  let report: Awaited<ReturnType<typeof loadHistoryHealth>> | null = null;
  let unavailable = false;
  try {
    report = await loadHistoryHealth();
  } catch (error) {
    unavailable = isMissingHistorySchema(error);
    if (!unavailable) console.error("history health failed", error);
  }
  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: "0 20px", fontFamily: "Georgia, serif" }}>
      <p><Link href="/admin">Admin</Link></p>
      <h1>History health</h1>
      {unavailable || !report ? <p>History tables are not available.</p> : null}
      {report ? (
        <>
          <p>
            {report.publicArtists} public artists. {report.richHistory} rich. {report.historyReady} history-ready. {report.lowDensity} low-density.
          </p>
          <p>
            {report.sharedExhibitions} shared exhibitions. Largest component {report.largestComponent}. {report.twoHopPairs} direct pairs. {report.documentedPaths} documented paths. {report.readablePaths} readable paths. {report.threeArtistRoutes} three-artist routes.
          </p>
          <h2>Frontier decisions</h2>
          <ul>
            {report.namedFrontier.map((row) => (
              <li key={row.name}>
                {row.name} · {row.status} · {row.recordCount} public exhibitions. {row.reason}
                {row.slug ? <> · <Link href={`/artists/${row.slug}`}>Open artist</Link></> : null}
                {row.sourceUrl ? <> · <a href={row.sourceUrl}>Open source</a></> : null}
              </li>
            ))}
          </ul>
          <h2>Missing searches</h2>
          <p>Real missing searches are counted separately from operator checks.</p>
          {report.noResultSearches.length === 0 ? <p>No missing-artist searches yet.</p> : null}
          <ul>
            {report.noResultSearches.map((row) => (
              <li key={row.query}>
                {row.query} · real {row.count} · operator {row.operatorCount} · last real {row.lastSearched ?? "time not recorded"}
                {row.possibleAlias ? ` · alias ${row.possibleAlias}` : ""}
                {row.unresolvedCandidate ? ` · unresolved ${row.unresolvedCandidate}` : ""}
                {row.frontierStatus ? ` · ${row.frontierStatus}` : ""}
              </li>
            ))}
          </ul>
          <h2>Journey depth</h2>
          <p>
            Depth events, with no visitor identity. 1 artist {report.journey.oneArtist}. 2 artists {report.journey.twoArtists}. 3 artists {report.journey.threeArtists}. 4 or more {report.journey.fourOrMore}.
          </p>
          <p>
            Opened to second {report.journey.openedToSecond ?? "n/a"}. Second to third {report.journey.secondToThird ?? "n/a"}. Third to fourth {report.journey.thirdToFourth ?? "n/a"}.
          </p>
          <h2>Graph frontier</h2>
          <ul>
            {report.frontier.map((row) => (
              <li key={`${row.reason}-${row.artist}`}>
                {row.artist} · {row.reason} · {row.currentRecords} records · component {row.currentComponent}
                {row.searchDemand > 0 ? ` · searched ${row.searchDemand}` : ""}
                {row.sharedMomentSource ? ` · ${row.sharedMomentSource}` : ""}
              </li>
            ))}
          </ul>
          <h2>Unresolved names</h2>
          <ul>
            {report.unresolvedParticipants.length === 0 ? <li>None</li> : null}
            {report.unresolvedParticipants.map((label) => {
              const decision = report.namedFrontier.find((row) => row.name === label);
              return (
                <li key={label}>
                  {label}
                  {decision?.slug ? <> · <Link href={`/artists/${decision.slug}`}>Open artist</Link></> : null}
                  {decision?.sourceUrl ? <> · <a href={decision.sourceUrl}>Open source</a></> : null}
                </li>
              );
            })}
          </ul>
          <h2>Isolated artists</h2>
          <ul>
            {report.isolatedArtists.length === 0 ? <li>None</li> : null}
            {report.isolatedArtists.map((slug) => (
              <li key={slug}><Link href={`/artists/${slug}`}>{slug}</Link></li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
