"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { trackHistory } from "@/lib/history/analytics";

export default function ArtistOpenLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <Link
      href={`/artists/${slug}`}
      onClick={() => trackHistory("PRO_ARTIST_OPENED", `/artists/${slug}`)}
    >
      {children}
    </Link>
  );
}
