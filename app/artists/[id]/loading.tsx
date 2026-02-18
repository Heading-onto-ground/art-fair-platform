"use client";

import TopBar from "@/app/components/TopBar";
import { CardSkeleton } from "@/app/components/Skeleton";

export default function ArtistPublicLoading() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 12px" }}>
        <CardSkeleton count={3} />
      </main>
    </>
  );
}

