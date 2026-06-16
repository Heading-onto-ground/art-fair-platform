"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { F, S, colors } from "@/lib/design";
import HashtagText from "@/app/components/HashtagText";
import ArtworkUploadModal from "@/app/components/ArtworkUploadModal";
import ArtworkEngagementPanel from "@/app/components/ArtworkEngagementPanel";
import ArtistBottomNav from "@/app/components/ArtistBottomNav";
import ProfileEditModal from "@/app/components/ProfileEditModal";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";
import type { ArtworkPostType } from "@/lib/artworkTypes";

type FeedPost = {
  id: string;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  postType: ArtworkPostType;
  hashtags: string[];
  createdAt: string;
  artist: {
    artistId: string;
    name: string;
    profileImage: string | null;
    genre: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
};

type MyProfile = {
  name: string;
  artistId: string;
  profileImage?: string | null;
  genre?: string;
  bio?: string | null;
  city?: string;
  country?: string;
  startedYear?: number;
  instagram?: string | null;
};

type Props = {
  lang: string;
};

function PostGrid({
  posts,
  onSelect,
}: {
  posts: FeedPost[];
  onSelect: (post: FeedPost) => void;
}) {
  if (posts.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          onClick={() => onSelect(post)}
          style={{ position: "relative", aspectRatio: "1", padding: 0, border: "none", cursor: "pointer", overflow: "hidden", background: "#111" }}
        >
          <img src={post.imageUrl} alt={post.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {post.postType === "exhibition" && (
            <span style={{ position: "absolute", top: 6, right: 6, fontSize: 10, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>◆</span>
          )}
        </button>
      ))}
    </div>
  );
}

function GuestIntro({ lang }: { lang: string }) {
  const ko = lang === "ko";
  return (
    <div style={{ padding: "20px 4px 24px", borderBottom: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: `1px solid ${colors.border}`,
            background: colors.bgAccent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: S,
            fontSize: 22,
            fontWeight: 600,
            color: colors.accent,
          }}
        >
          R
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: S, fontSize: 20, fontWeight: 400, color: colors.textPrimary, marginBottom: 2 }}>
            Role of Bridge
          </div>
          <div style={{ fontFamily: F, fontSize: 11, color: colors.accent, marginBottom: 10 }}>rob-roleofbridge.com</div>
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: "0 0 12px", lineHeight: 1.7 }}>
            {ko
              ? "작가가 작업을 올리고, #해시태그로 발견되며, 갤러리·큐레이터와 연결되는 예술 플랫폼입니다."
              : "Artists share work, get discovered via #hashtags, and connect with galleries & curators."}
          </p>
          <div style={{ padding: "12px 14px", background: colors.bgAccent, border: `1px solid ${colors.borderLight}` }}>
            <p style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.accent, margin: "0 0 8px" }}>
              {ko ? "기여 포인트" : "Contribution Points"}
            </p>
            <p style={{ fontFamily: F, fontSize: 11, color: colors.textSecondary, margin: "0 0 8px", lineHeight: 1.65 }}>
              {ko
                ? "프로필을 채우고, 작업을 올리고, 전시·활동을 기록할수록 포인트가 쌓입니다."
                : "Earn points by completing your profile, sharing work, and recording exhibitions & activities."}
            </p>
            <p style={{ fontFamily: F, fontSize: 11, color: colors.textSecondary, margin: 0, lineHeight: 1.65 }}>
              {ko
                ? "포인트로 물감·캔버스 등 작업 재료 할인 혜택을 받을 수 있습니다. 제휴 온라인 샵을 준비 중입니다."
                : "Redeem points for discounts on paints, canvas, and art supplies. Partner shops coming soon."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileHeader({ profile, postCount, lang, onEdit }: { profile: MyProfile; postCount: number; lang: string; onEdit: () => void }) {
  const ko = lang === "ko";
  const yearsActive = profile.startedYear ? Math.max(0, new Date().getFullYear() - profile.startedYear) : null;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <div style={{ padding: "20px 4px 16px", borderBottom: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 16 }}>
        <button
          type="button"
          onClick={onEdit}
          aria-label={ko ? "프로필 사진 변경" : "Change profile photo"}
          style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: `1px solid ${colors.border}`, background: colors.bgAccent, flexShrink: 0, padding: 0, cursor: "pointer", position: "relative" }}
        >
          {profile.profileImage ? (
            <img src={profile.profileImage} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: F, fontSize: 10, color: colors.textMuted, gap: 2 }}>
              <span style={{ fontFamily: S, fontSize: 28, color: colors.textLight, lineHeight: 1 }}>{profile.name.charAt(0)}</span>
              <span style={{ fontSize: 9 }}>{ko ? "+ 사진" : "+ Photo"}</span>
            </span>
          )}
        </button>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-around", textAlign: "center", paddingTop: 8 }}>
          <div>
            <div style={{ fontFamily: F, fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{postCount}</div>
            <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>{ko ? "게시물" : "Posts"}</div>
          </div>
          {yearsActive !== null && yearsActive > 0 && (
            <div>
              <div style={{ fontFamily: F, fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{yearsActive}</div>
              <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>{ko ? "년 활동" : "Years"}</div>
            </div>
          )}
          {profile.genre && (
            <div style={{ maxWidth: 80 }}>
              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: colors.textPrimary, lineHeight: 1.3 }}>{profile.genre}</div>
              <div style={{ fontFamily: F, fontSize: 10, color: colors.textMuted }}>{ko ? "장르" : "Genre"}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{profile.name}</div>
        <div style={{ fontFamily: F, fontSize: 12, color: colors.textMuted }}>@{profile.artistId}</div>
        {location && <div style={{ fontFamily: F, fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{location}</div>}
        {profile.bio ? (
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textSecondary, margin: "8px 0 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profile.bio}</p>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            style={{ marginTop: 8, padding: 0, border: "none", background: "none", fontFamily: F, fontSize: 12, color: colors.accent, cursor: "pointer", textAlign: "left" }}
          >
            {ko ? "+ 자기소개 추가하기" : "+ Add bio"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onEdit}
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${colors.border}`, background: colors.bgAccent, fontFamily: F, fontSize: 11, fontWeight: 500, cursor: "pointer", color: colors.textPrimary }}
        >
          {ko ? "프로필 편집" : "Edit profile"}
        </button>
        <Link
          href={`/artist/public/${encodeURIComponent(profile.artistId)}`}
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${colors.border}`, background: colors.bgAccent, fontFamily: F, fontSize: 11, fontWeight: 500, textAlign: "center", textDecoration: "none", color: colors.textPrimary }}
        >
          {ko ? "공개 포트폴리오" : "Public portfolio"}
        </Link>
      </div>
    </div>
  );
}

export default function ArtistFeed({ lang }: Props) {
  const ko = lang === "ko";
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [feedMode, setFeedMode] = useState<"global" | "mine">("global");
  const [selected, setSelected] = useState<FeedPost | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const me = await meRes.json().catch(() => null);
      const role = me?.session?.role ?? null;
      const loggedIn = !!me?.session;
      setIsLoggedIn(loggedIn);
      setIsArtist(role === "artist");

      if (role === "artist" && me.profile) {
        const p = me.profile;
        setMyProfile({
          name: p.name,
          artistId: p.artistId,
          profileImage: p.profileImage,
          genre: p.genre,
          bio: p.bio,
          city: p.city,
          country: p.country,
          startedYear: p.startedYear,
          instagram: p.instagram,
        });
        setFeedMode("mine");
        const res = await fetch("/api/artist/artworks", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.artworks) {
          setPosts(
            data.artworks.map((a: FeedPost) => ({
              ...a,
              artist: {
                artistId: p.artistId,
                name: p.name,
                profileImage: p.profileImage ?? null,
                genre: p.genre ?? null,
                city: p.city,
                country: p.country,
              },
            })),
          );
        }
      } else {
        setMyProfile(null);
        setFeedMode("global");
        const res = await fetch("/api/artworks/feed?limit=60", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.posts) setPosts(data.posts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 88 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px 8px" }}>
          <span style={{ fontFamily: S, fontSize: 20, fontWeight: 600, color: colors.textPrimary, letterSpacing: "0.04em" }}>
            {feedMode === "mine" && myProfile ? `@${myProfile.artistId}` : "ROB"}
          </span>
          {!isLoggedIn && (
            <Link href="/login?redirect=/" style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent, textDecoration: "none" }}>
              {ko ? "로그인" : "Log in"}
            </Link>
          )}
        </div>

        {feedMode === "global" ? (
          <GuestIntro lang={lang} />
        ) : myProfile ? (
          <ProfileHeader profile={myProfile} postCount={posts.length} lang={lang} onEdit={() => setProfileEditOpen(true)} />
        ) : null}

        <div style={{ display: "flex", justifyContent: "center", gap: 0, borderBottom: `1px solid ${colors.border}`, marginBottom: 2 }}>
          <button type="button" style={{ flex: 1, padding: "12px 0", border: "none", borderBottom: `2px solid ${colors.textPrimary}`, background: "none", fontFamily: F, fontSize: 16, color: colors.textPrimary, cursor: "default" }}>
            ▦
          </button>
        </div>

        {loading ? (
          <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, textAlign: "center", padding: "48px 0" }}>
            {ko ? "불러오는 중…" : "Loading…"}
          </p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <p style={{ fontFamily: F, fontSize: 13, color: colors.textMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
              {feedMode === "mine"
                ? ko ? "아직 올린 작업이 없어요. + 버튼으로 첫 작업을 올려보세요." : "No posts yet. Tap + to share your first work."
                : ko ? "아직 게시물이 없어요." : "No posts yet."}
            </p>
            {feedMode === "mine" ? (
              <button type="button" onClick={() => setUploadOpen(true)} style={{ padding: "10px 24px", border: "none", background: colors.textPrimary, color: colors.bgPrimary, fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                + {ko ? "작업 올리기" : "Share"}
              </button>
            ) : (
              <p style={{ fontFamily: F, fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
                {ko ? "로그인하고 첫 작업을 올려보세요." : "Log in to share the first post."}
              </p>
            )}
          </div>
        ) : (
          <PostGrid posts={posts} onSelect={setSelected} />
        )}

        {feedMode === "global" && posts.length > 0 && (
          <p style={{ fontFamily: F, fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: 24 }}>
            <Link href="/explore" style={{ color: colors.accent, textDecoration: "none" }}>
              {ko ? "#해시태그로 탐색 →" : "Explore #hashtags →"}
            </Link>
          </p>
        )}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setSelected(null)}
        >
          <div style={{ width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", background: colors.bgCard }} onClick={(e) => e.stopPropagation()}>
            {selected.artist && feedMode === "global" && (
              <button
                type="button"
                onClick={() => router.push(`/artist/public/${encodeURIComponent(selected.artist!.artistId)}`)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", border: "none", borderBottom: `1px solid ${colors.borderLight}`, background: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: colors.bgAccent }}>
                  {selected.artist.profileImage ? <img src={selected.artist.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                </div>
                <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600 }}>{selected.artist.name}</span>
              </button>
            )}
            <div style={{ aspectRatio: "1", background: "#111" }}>
              <img src={selected.imageUrl} alt={selected.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: "14px 16px 18px" }}>
              <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>
                {ko ? POST_TYPE_LABELS[selected.postType].ko : POST_TYPE_LABELS[selected.postType].en}
                <span style={{ color: colors.textLight, marginLeft: 10, fontWeight: 400 }}>{artworkTimeAgo(selected.createdAt, lang)}</span>
              </div>
              {selected.caption && (
                <p style={{ fontFamily: F, fontSize: 13, color: colors.textPrimary, margin: "0 0 12px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  <HashtagText text={selected.caption} />
                </p>
              )}
              <ArtworkEngagementPanel artworkId={selected.id} lang={lang} isLoggedIn={isLoggedIn} />
              <button type="button" onClick={() => setSelected(null)} style={{ marginTop: 14, width: "100%", padding: "10px", border: `1px solid ${colors.border}`, background: "transparent", fontFamily: F, fontSize: 11, cursor: "pointer", color: colors.textMuted }}>
                {ko ? "닫기" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ArtworkUploadModal lang={lang} open={uploadOpen} onClose={() => setUploadOpen(false)} onPosted={load} />
      {myProfile && (
        <ProfileEditModal
          open={profileEditOpen}
          onClose={() => setProfileEditOpen(false)}
          lang={lang}
          profileImage={myProfile.profileImage}
          bio={myProfile.bio}
          onSaved={(data) => {
            setMyProfile((prev) => (prev ? { ...prev, ...data } : prev));
          }}
        />
      )}
      <ArtistBottomNav lang={lang} activeTab="home" onCreate={() => setUploadOpen(true)} />
    </>
  );
}
