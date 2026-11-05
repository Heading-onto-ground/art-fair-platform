import { Suspense } from "react";
import { redirect } from "next/navigation";
import RegisteredArtistPage from "./RegisteredArtistPage";
import HistoryExperience from "@/app/components/history/HistoryExperience";
import { loadPublicArtist } from "@/lib/history/queries";
import { artistJsonLd, breadcrumbJsonLd } from "@/lib/history/seo";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { SITE_URL } from "@/lib/seo";
import { withPreservedSearch } from "@/lib/history/journeyTrail";
import { historyLocale, pinnedPath } from "@/lib/history/requestLocale";

// The same route still renders legacy account profiles, which are not public
// history. Keep the route dynamic and cache only the public history load.
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";
export const runtime = "nodejs";

function isNextRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const locale = historyLocale();
  try {
    const loaded = await loadPublicArtist(params.id);
    if (loaded.kind === "redirect") redirect(withPreservedSearch(pinnedPath(loaded.to), searchParams));
    if (loaded.kind === "history") {
      const path = pinnedPath(`/artists/${loaded.artist.slug}`);
      const json = artistJsonLd({
        name: loaded.artist.canonicalName,
        nativeName: loaded.artist.nativeName,
        url: `${SITE_URL}${path}`,
        aliases: loaded.artist.aliases,
        birthYear: loaded.artist.birthYear,
        sameAs: loaded.artist.officialWebsite,
      });
      const crumbs = breadcrumbJsonLd([
        { name: "ROB", path: pinnedPath("/") },
        { name: loaded.artist.canonicalName, path },
      ], SITE_URL);
      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
          <Suspense>
            <HistoryExperience artist={loaded.artist} locale={locale} />
          </Suspense>
        </>
      );
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    if (!isMissingHistorySchema(error)) console.error("history artist page failed", error);
  }
  return <RegisteredArtistPage />;
}
