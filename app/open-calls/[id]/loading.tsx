"use client";

import TopBar from "@/app/components/TopBar";
import { CardSkeleton } from "@/app/components/Skeleton";

export default function OpenCallDetailLoading() {
  return (
    <>
      <TopBar />
      <main style={{ padding: "48px 40px", maxWidth: 860, margin: "0 auto" }}>
        <CardSkeleton count={3} />
      </main>
    </>
  );
}

