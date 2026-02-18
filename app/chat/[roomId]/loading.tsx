"use client";

import TopBar from "@/app/components/TopBar";
import { CardSkeleton } from "@/app/components/Skeleton";

export default function ChatRoomLoading() {
  return (
    <>
      <TopBar />
      <main style={{ padding: "32px 40px", maxWidth: 860, margin: "0 auto" }}>
        <CardSkeleton count={4} />
      </main>
    </>
  );
}

