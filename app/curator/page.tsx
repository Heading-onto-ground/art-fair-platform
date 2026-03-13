"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import { useLanguage } from "@/lib/useLanguage";
import { F, S } from "@/lib/design";

type Session = { userId: string; role: string; email?: string };
type Profile = {
  id: string;
  name: string;
  curatorId: string;
  curatorType: "independent" | "institutional";
  organization?: string;
  instagram?: string;
  country?: string;
  city?: string;
  website?: string;
  bio?: string;
};

export default function CuratorPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  type CuratorListItem = { id: string; artistId: string; note?: string | null; order: number };
  type CuratorList = { id: string; title: string; description?: string | null; isPublic: boolean; items: CuratorListItem[] };
  const [lists, setLists] = useState<CuratorList[]>([]);
  const [newListTitle, setNewListTitle] = useState("");
  const [listSaving, setListSaving] = useState(false);
  const [addArtistId, setAddArtistId] = useState<Record<string, string>>({});

  const loadLists = async () => {
    const res = await fetch("/api/curator/lists", { credentials: "include" });
    const d = await res.json().catch(() => null);
    if (d?.lists) setLists(d.lists);
  };

  const createList = async () => {
    if (!newListTitle.trim() || listSaving) return;
    setListSaving(true);
    await fetch("/api/curator/lists", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newListTitle.trim() }) });
    setNewListTitle("");
    await loadLists();
    setListSaving(false);
  };

  const deleteList = async (listId: string) => {
    if (!confirm(tr("Delete this list?", "이 리스트를 삭제하시겠습니까?"))) return;
    await fetch("/api/curator/lists", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId }) });
    await loadLists();
  };

  const addArtist = async (listId: string) => {
    const artistId = (addArtistId[listId] || "").trim();
    if (!artistId) return;
    await fetch("/api/curator/lists/items", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId, artistId }) });
    setAddArtistId(p => ({ ...p, [listId]: "" }));
    await loadLists();
  };

  const removeArtist = async (listId: string, artistId: string) => {
    await fetch("/api/curator/lists/items", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId, artistId }) });
    await loadLists();
  };

  const tr = (en: string, ko: string) => lang === "ko" ? ko : en;

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me?lite=1", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      const role = data?.session?.role;
      if (!role) { router.replace("/login?role=curator"); return; }
      if (role !== "curator") { router.replace(role === "artist" ? "/artist" : "/gallery"); return; }
      setSession(data.session);
      setProfile(data.profile ?? null);
      setLoading(false);
    loadLists();
    })();
  }, [router]);

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={{ maxWidth: 900, margin: "80px auto", padding: "0 40px" }}>
          <div style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>Loading...</div>
        </main>
      </>
    );
  }

  const typeLabel =
    profile?.curatorType === "institutional"
      ? tr("Institutional Curator", "기관 큐레이터")
      : tr("Independent Curator", "독립 큐레이터");

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 56 }}>
          <div>
            <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
              {tr("Curator Dashboard", "큐레이터 대시보드")}
            </span>
            <h1 style={{ fontFamily: S, fontSize: 42, fontWeight: 300, color: "#1A1A1A", marginTop: 8, letterSpacing: "-0.01em" }}>
              {profile?.name ?? session?.email ?? "Curator"}
            </h1>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginTop: 8 }}>
              {typeLabel}
              {profile?.organization ? ` · ${profile.organization}` : ""}
              {profile?.country ? ` · ${profile.country}` : ""}
            </p>
          </div>
          <Link
            href="/curator/profile"
            style={{ padding: "10px 20px", border: "1px solid #1A1A1A", background: "transparent", color: "#1A1A1A", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1A1A1A"; e.currentTarget.style.color = "#FDFBF7"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1A1A1A"; }}
          >
            {tr("Edit Profile", "프로필 편집")}
          </Link>
        </div>

        {/* Profile Info */}
        <Section number="01" title={tr("My Profile", "내 프로필")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <InfoRow label={tr("Curator ID", "큐레이터 ID")} value={profile?.curatorId ?? "-"} />
            <InfoRow label={tr("Type", "유형")} value={typeLabel} />
            {profile?.organization && <InfoRow label={tr("Organization", "소속 기관")} value={profile.organization} />}
            {profile?.city && <InfoRow label={tr("Location", "위치")} value={[profile.city, profile.country].filter(Boolean).join(", ")} />}
            {profile?.instagram && <InfoRow label="Instagram" value={`@${profile.instagram.replace(/^@/, "")}`} />}
            {profile?.website && (
              <InfoRow label={tr("Website", "웹사이트")} value={
                <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: "#8B7355", textDecoration: "underline" }}>{profile.website}</a>
              } />
            )}
          </div>
          {profile?.bio && (
            <p style={{ fontFamily: F, fontSize: 13, color: "#4A4A4A", lineHeight: 1.7, marginTop: 20, paddingTop: 20, borderTop: "1px solid #E8E3DB" }}>
              {profile.bio}
            </p>
          )}
        </Section>

        {/* Explore */}
        <Section number="02" title={tr("Explore", "탐색")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "#E8E3DB" }}>
            <NavCard
              href="/artists"
              title={tr("Artists", "작가 탐색")}
              desc={tr("Browse global artist portfolios", "전 세계 작가 포트폴리오 탐색")}
            />
            <NavCard
              href="/open-calls"
              title={tr("Open Calls", "오픈콜")}
              desc={tr("Discover open calls from galleries", "갤러리 오픈콜 탐색")}
            />
            <NavCard
              href="/community"
              title={tr("Community", "커뮤니티")}
              desc={tr("Connect with artists and galleries", "작가·갤러리와 소통")}
            />
            <NavCard
              href="/shipments"
              title={tr("Shipments", "배송")}
              desc={tr("Track shipments", "배송 예약·추적")}
            />
            <NavCard
              href="/chat"
              title={tr("Messages", "메시지")}
              desc={tr("Chat with artists and galleries", "작가·갤러리와 대화")}
            />
          </div>
        </Section>

        {/* My Lists */}
        <Section number="03" title={tr("My Artist Lists", "내 작가 리스트")}>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createList()}
              placeholder={tr("New list title...", "새 리스트 이름...")}
              style={{ flex: 1, padding: "10px 14px", border: "1px solid #E8E3DB", fontFamily: F, fontSize: 12, outline: "none" }}
            />
            <button onClick={createList} disabled={listSaving || !newListTitle.trim()} style={{ padding: "10px 20px", border: "none", background: "#1A1A1A", color: "#FFFFFF", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", opacity: listSaving ? 0.6 : 1 }}>
              {tr("Create", "생성")}
            </button>
          </div>
          {lists.length === 0 ? (
            <p style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>{tr("No lists yet.", "리스트가 없습니다.")}</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {lists.map(list => (
                <div key={list.id} style={{ border: "1px solid #E8E3DB", padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontFamily: S, fontSize: 18, color: "#1A1A1A" }}>{list.title}</span>
                      <span style={{ fontFamily: F, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: list.isPublic ? "#2E6B45" : "#8A8580", marginLeft: 10, padding: "2px 8px", border: `1px solid ${list.isPublic ? "#D6EAD8" : "#E8E3DB"}` }}>
                        {list.isPublic ? tr("Public", "공개") : tr("Private", "비공개")}
                      </span>
                    </div>
                    <button onClick={() => deleteList(list.id)} style={{ padding: "4px 10px", border: "1px solid rgba(139,74,74,0.3)", color: "#8B4A4A", background: "transparent", fontFamily: F, fontSize: 9, cursor: "pointer" }}>
                      {tr("Delete", "삭제")}
                    </button>
                  </div>
                  {list.items.length > 0 && (
                    <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {list.items.map(item => (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid #E8E3DB", background: "#FAF8F4" }}>
                          <span style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{item.artistId}</span>
                          <button onClick={() => removeArtist(list.id, item.artistId)} style={{ border: "none", background: "none", color: "#B0AAA2", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={addArtistId[list.id] || ""}
                      onChange={e => setAddArtistId(p => ({ ...p, [list.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addArtist(list.id)}
                      placeholder={tr("Artist ID to add...", "추가할 작가 ID...")}
                      style={{ flex: 1, padding: "7px 10px", border: "1px solid #E8E3DB", fontFamily: F, fontSize: 11, outline: "none" }}
                    />
                    <button onClick={() => addArtist(list.id)} style={{ padding: "7px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 10, cursor: "pointer" }}>
                      {tr("Add", "추가")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Account */}
        <Section number="04" title={tr("Account", "계정")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580" }}>
              {tr("Email", "이메일")}: {session?.email ?? "-"}
            </p>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
              style={{ alignSelf: "flex-start", padding: "10px 20px", border: "1px solid #E8E3DB", background: "transparent", color: "#8A8580", fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {tr("Sign Out", "로그아웃")}
            </button>
          </div>
        </Section>
      </main>

      <style jsx global>{`
        @media (max-width: 768px) {
          main { padding: 32px 20px !important; }
        }
      `}</style>
    </>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
        <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", color: "#B0AAA2" }}>{number}</span>
        <h2 style={{ fontFamily: S, fontSize: 24, fontWeight: 400, color: "#1A1A1A" }}>{title}</h2>
      </div>
      <div style={{ border: "1px solid #E8E3DB", padding: 28, background: "#FFFFFF" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#B0AAA2", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: "#1A1A1A" }}>{value}</div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{ padding: 24, background: "#FFFFFF", transition: "background 0.2s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FAF8F4"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#FFFFFF"; }}
      >
        <div style={{ fontFamily: S, fontSize: 18, fontWeight: 400, color: "#1A1A1A", marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: F, fontSize: 11, color: "#8A8580", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </Link>
  );
}
