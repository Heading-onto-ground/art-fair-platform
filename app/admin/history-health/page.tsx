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
            {report.sharedExhibitions} shared exhibitions. Largest component {report.largestComponent}. {report.twoHopPairs} direct pairs. {report.threeArtistRoutes} three-artist routes.
          </p>
          <h2>Missing searches</h2>
          {report.noResultSearches.length === 0 ? <p>No missing-artist searches yet.</p> : null}
          <ul>
            {report.noResultSearches.map((row) => (
              <li key={row.query}>{row.query} · {row.count} · {row.lastSearched ?? "time not recorded"}</li>
            ))}
          </ul>
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
          <p>{report.unresolvedParticipants.join(", ") || "None"}</p>
          <h2>Isolated artists</h2>
          <p>{report.isolatedArtists.join(", ") || "None"}</p>
        </>
      ) : null}
    </main>
  );
}
