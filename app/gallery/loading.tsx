"use client";

import TopBar from "@/app/components/TopBar";
import { CardSkeleton } from "@/app/components/Skeleton";

export default function GalleryDashboardLoading() {
  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1000, margin: "48px auto", padding: "0 40px" }}>
        <div style={{ padding: "clamp(20px, 3vw, 48px)" }}>
          <CardSkeleton count={5} />
        </div>
      </main>
    </>
  );
}

