"use client";

import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import GatheringManager from "@/app/components/GatheringManager";
import { F, S, colors } from "@/lib/design";

export default function AdminGatheringsPage() {
  const router = useRouter();
  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 96px" }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: colors.accent }}>Admin · Gathering</span>
        <h1 style={{ fontFamily: S, fontSize: 30, fontWeight: 300, color: colors.textPrimary, margin: "4px 0 16px" }}>모임 회차 기록</h1>
        <GatheringManager onUnauthorized={() => router.replace("/admin/login")} />
      </main>
    </>
  );
}
