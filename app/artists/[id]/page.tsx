import { Suspense } from "react";
import { redirect } from "next/navigation";
import RegisteredArtistPage from "./RegisteredArtistPage";
import HistoryExperience from "@/app/components/history/HistoryExperience";
import { loadPublicArtist } from "@/lib/history/queries";
import { artistJsonLd } from "@/lib/history/seo";
import { isMissingHistorySchema } from "@/lib/history/schemaError";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function ArtistPage({ params }: { params: { id: string } }) {
  try {
    const loaded = await loadPublicArtist(params.id);
    if (loaded.kind === "redirect") redirect(loaded.to);
    if (loaded.kind === "history") {
      const json = artistJsonLd({
        name: loaded.artist.canonicalName,
        nativeName: loaded.artist.nativeName,
        url: `${SITE_URL}/artists/${loaded.artist.slug}`,
        birthYear: loaded.artist.birthYear,
      });
      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
          <Suspense>
            <HistoryExperience artist={loaded.artist} />
          </Suspense>
        </>
      );
    }
  } catch (error) {
    if (!isMissingHistorySchema(error)) console.error("history artist page failed", error);
  }
  return <RegisteredArtistPage />;
}
