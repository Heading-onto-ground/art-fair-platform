import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost } from "@/app/data/community";

const SITE = "https://www.rob-roleofbridge.com";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) return {};

  const description = post.content.slice(0, 160).replace(/\n/g, " ");
  const images = post.imageUrl ? [{ url: post.imageUrl }] : [];

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      url: `${SITE}/community/${params.id}`,
      title: `${post.title} — ROB Community`,
      description,
      siteName: "ROB — Role of Bridge",
      ...(images.length > 0 && { images }),
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: `${post.title} — ROB Community`,
      description,
      ...(images.length > 0 && { images: [images[0].url] }),
    },
  };
}

export default async function CommunityPostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) notFound();

  const F = "var(--font-inter), sans-serif";
  const S = "var(--font-cormorant), serif";
  const date = new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", minHeight: "100vh", fontFamily: F }}>
      <Link href="/community" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580", textDecoration: "none", marginBottom: 40 }}>
        ← Community
      </Link>

      <article>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: F, fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B7355", padding: "4px 10px", border: "1px solid #E8E3DB" }}>
            {post.category.replace(/_/g, " ")}
          </span>
        </div>

        <h1 style={{ fontFamily: S, fontSize: "clamp(26px,5vw,40px)", fontWeight: 400, color: "#1A1A1A", lineHeight: 1.25, marginBottom: 16 }}>
          {post.title}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #E8E3DB" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: post.authorRole === "artist" ? "#F0EBE3" : "#E8E3DB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontSize: 13, fontWeight: 600, color: "#8B7355" }}>
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>{post.authorName}</div>
            <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{post.authorRole} · {date}</div>
          </div>
        </div>

        {post.imageUrl && (
          <img src={post.imageUrl} alt={post.title} style={{ width: "100%", maxHeight: 480, objectFit: "cover", marginBottom: 28 }} />
        )}

        <div style={{ fontFamily: F, fontSize: 15, color: "#2A2A2A", lineHeight: 1.85, whiteSpace: "pre-wrap", marginBottom: 40 }}>
          {post.content}
        </div>

        <div style={{ paddingTop: 24, borderTop: "1px solid #E8E3DB", display: "flex", gap: 20, fontFamily: F, fontSize: 12, color: "#B0AAA2" }}>
          <span>♡ {(post as any)._count?.likes ?? 0}</span>
          <span>💬 {(post as any)._count?.comments ?? 0}</span>
        </div>
      </article>

      <div style={{ marginTop: 48, padding: "24px", background: "#FAF8F4", border: "1px solid #E8E3DB", textAlign: "center" }}>
        <p style={{ fontFamily: F, fontSize: 12, color: "#8A8580", marginBottom: 12 }}>ROB — Role of Bridge | Global Art Platform</p>
        <Link href="/community" style={{ display: "inline-block", padding: "12px 28px", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
          커뮤니티 전체 보기
        </Link>
      </div>
    </main>
  );
}
