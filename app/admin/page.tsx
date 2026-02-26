"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

type AdminCategory = {
  title: string;
  description: string;
  href: string;
};

export default function AdminHomePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [bots, setBots] = useState<{ name: string; genre: string; location: string }[]>([]);

  const loadBots = () => {
    fetch("/api/admin/seed-bots", { credentials: "include" }).then((r) => r.json()).then((d) => { if (Array.isArray(d.bots)) setBots(d.bots); }).catch(() => {});
  };

  useEffect(() => {
    if (authenticated) loadBots();
  }, [authenticated]);

  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        if (data?.authenticated) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          router.replace("/admin/login");
        }
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  if (authenticated === null) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FDFBF7",
        }}
      >
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
          {tr("Authenticating...", "인증 중...", "認証中...", "Authentification...")}
        </p>
      </main>
    );
  }

  if (!authenticated) return null;

  const categories: AdminCategory[] = [
    {
      title: tr("Growth Dashboard", "성장 대시보드", "成長ダッシュボード", "Tableau croissance"),
      description: tr(
        "Run outreach, crawlers, and reminder automations.",
        "아웃리치, 크롤러, 리마인더 자동화를 운영합니다.",
        "アウトリーチ、クローラー、リマインダー自動化を運用します。",
        "Pilotez outreach, crawler et rappels automatiques."
      ),
      href: "/admin/outreach",
    },
    {
      title: tr("Users", "가입자", "ユーザー", "Utilisateurs"),
      description: tr(
        "Check artist/gallery signups and profile completion.",
        "작가/갤러리 가입 현황과 프로필 완성도를 확인합니다.",
        "アーティスト/ギャラリー登録状況とプロフィール完成度を確認します。",
        "Consultez inscriptions et completion des profils."
      ),
      href: "/admin/users",
    },
    {
      title: tr("Sources", "소스", "ソース", "Sources"),
      description: tr(
        "Manage gallery source JSON and trigger sync instantly.",
        "갤러리 소스 JSON을 관리하고 즉시 동기화합니다.",
        "ギャラリーソースJSONを管理し、即時同期します。",
        "Gerez le JSON des sources et synchronisez immediatement."
      ),
      href: "/admin/sources",
    },
    {
      title: tr("Preview", "미리보기", "プレビュー", "Apercu"),
      description: tr(
        "Preview artist/gallery pages in admin read-only mode.",
        "아티스트/갤러리 페이지를 관리자 읽기전용으로 미리 봅니다.",
        "アーティスト/ギャラリーページを管理者の閲覧専用でプレビューします。",
        "Previsualisez les pages artiste/galerie en lecture seule."
      ),
      href: "/artist?adminView=1",
    },
    {
      title: tr("About Editor", "소개 편집", "About編集", "Edition About"),
      description: tr(
        "Edit About page text and founder image.",
        "About 페이지 텍스트와 창립자 이미지를 수정합니다.",
        "Aboutページのテキストと創設者画像を編集します。",
        "Modifiez les textes About et l'image du fondateur."
      ),
      href: "/admin/about",
    },
    {
      title: tr("Security", "보안", "セキュリティ", "Securite"),
      description: tr(
        "Apply Supabase RLS hardening and permission cleanup.",
        "Supabase RLS 강화 및 권한 정리를 적용합니다.",
        "Supabase RLS強化と権限クリーンアップを適用します。",
        "Appliquez le renforcement RLS et le nettoyage des droits Supabase."
      ),
      href: "/admin/security",
    },
    {
      title: tr("Mail", "메일", "メール", "Mail"),
      description: tr(
        "Send direct emails from admin with reply-to support.",
        "관리자에서 회신 주소를 포함해 직접 메일을 발송합니다.",
        "管理画面から返信先付きで直接メールを送信します。",
        "Envoyez des emails directs depuis l'admin avec adresse de reponse."
      ),
      href: "/admin/mail",
    },
    {
      title: tr("Gallery Emails", "갤러리 이메일", "ギャラリーメール", "Emails galeries"),
      description: tr(
        "View all gallery email addresses in the directory.",
        "디렉토리에 등록된 모든 갤러리 이메일 주소를 확인합니다.",
        "ディレクトリ登録済みの全ギャラリーメールを確認します。",
        "Consultez tous les emails de galeries dans le repertoire."
      ),
      href: "/admin/gallery-emails",
    },
  ];

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 34 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B7355",
            }}
          >
            {tr("Admin Home", "관리자 홈", "管理ホーム", "Accueil admin")}
          </span>
          <h1
            style={{
              fontFamily: S,
              fontSize: 40,
              fontWeight: 300,
              color: "#1A1A1A",
              marginTop: 8,
            }}
          >
            {tr("Control Center", "컨트롤 센터", "コントロールセンター", "Centre de controle")}
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {categories.map((c) => (
            <button
              key={c.href}
              onClick={() => router.push(c.href)}
              style={{
                border: "1px solid #E8E3DB",
                background: "#FFFFFF",
                textAlign: "left",
                padding: "22px 22px 24px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontFamily: S,
                  fontSize: 24,
                  color: "#1A1A1A",
                  marginBottom: 10,
                }}
              >
                {c.title}
              </div>
              <div
                style={{
                  fontFamily: F,
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "#8A8580",
                }}
              >
                {c.description}
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #E8E3DB", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={async () => {
              setSeedMsg("...");
              const res = await fetch("/api/admin/seed-bots", { method: "POST", credentials: "include" });
              const data = await res.json().catch(() => null);
              setSeedMsg(data?.created?.length ? `봇 생성: ${data.created.join(", ")}` : "이미 모두 존재합니다.");
              loadBots();
            }}
            style={{ padding: "10px 24px", border: "1px solid #E8E3DB", background: "#1A1A1A", color: "#FDFBF7", fontFamily: F, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {tr("Seed Bot Accounts", "봇 계정 생성", "ボットアカウント生成", "Créer bots")}
          </button>
          {seedMsg && <span style={{ fontFamily: F, fontSize: 12, color: "#8A8580" }}>{seedMsg}</span>}
        </div>
        {bots.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {bots.map((b) => (
              <div key={b.name} style={{ padding: "8px 14px", border: "1px solid #E8E3DB", background: "#FFFFFF", fontFamily: F, fontSize: 11, color: "#8A8580" }}>
                <span style={{ color: "#1A1A1A", fontWeight: 500 }}>{b.name}</span> · {b.genre} · {b.location}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

