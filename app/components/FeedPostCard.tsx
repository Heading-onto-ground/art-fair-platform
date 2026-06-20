"use client";

import { useRouter } from "next/navigation";
import { F, colors } from "@/lib/design";
import HashtagText from "@/app/components/HashtagText";
import ArtworkEngagementPanel from "@/app/components/ArtworkEngagementPanel";
import { artworkTimeAgo } from "@/lib/artworkImageUtils";
import { POST_TYPE_LABELS } from "@/lib/artworkTypes";
import type { ArtworkPostType } from "@/lib/artworkTypes";

export type FeedPost = {
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

type Props = {
  post: FeedPost;
  lang: string;
  isLoggedIn: boolean;
};

export default function FeedPostCard({ post, lang, isLoggedIn }: Props) {
  const ko = lang === "ko";
  const router = useRouter();

  return (
    <article style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: 16, marginBottom: 16 }}>
      {post.artist && (
        <button
          type="button"
          onClick={() => router.push(`/artist/public/${encodeURIComponent(post.artist!.artistId)}`)}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 4px", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
        >
          <span style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: colors.bgAccent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {post.artist.profileImage ? (
              <img src={post.artist.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontFamily: F, fontSize: 13, color: colors.textLight }}>{post.artist.name.charAt(0)}</span>
            )}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontFamily: F, fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{post.artist.name}</span>
            {(post.artist.city || post.artist.genre) && (
              <span style={{ display: "block", fontFamily: F, fontSize: 10, color: colors.textMuted }}>
                {[post.artist.city, post.artist.genre].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
        </button>
      )}

      <div style={{ aspectRatio: "1", background: "#111" }}>
        <img src={post.imageUrl} alt={post.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>

      <div style={{ padding: "12px 4px 0" }}>
        <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent, marginBottom: 8 }}>
          {ko ? POST_TYPE_LABELS[post.postType].ko : POST_TYPE_LABELS[post.postType].en}
          <span style={{ color: colors.textLight, marginLeft: 10, fontWeight: 400 }}>{artworkTimeAgo(post.createdAt, lang)}</span>
        </div>
        {post.caption && (
          <p style={{ fontFamily: F, fontSize: 13, color: colors.textPrimary, margin: "0 0 12px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            <HashtagText text={post.caption} />
          </p>
        )}
        <ArtworkEngagementPanel artworkId={post.id} lang={lang} isLoggedIn={isLoggedIn} />
      </div>
    </article>
  );
}
