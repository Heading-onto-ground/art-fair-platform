"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/app/components/AdminTopBar";
import { F, S } from "@/lib/design";
import { useLanguage } from "@/lib/useLanguage";

export default function AdminMailPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [targetMode, setTargetMode] = useState<"manual" | "platform">("platform");
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      emailType: string;
      toEmail: string;
      subject: string;
      status: string;
      error?: string | null;
      createdAt: number;
    }>
  >([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [templateId, setTemplateId] = useState("custom");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<{
    artist: { subject: string; message: string } | null;
    gallery: { subject: string; message: string } | null;
  }>({ artist: null, gallery: null });
  const [platformUsers, setPlatformUsers] = useState<
    Array<{
      id: string;
      email: string;
      role: "artist" | "gallery";
      name: string;
      country: string;
      city: string;
    }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("selected");
  const [roleFilter, setRoleFilter] = useState<"all" | "artist" | "gallery">("all");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    to: "",
    subject: "",
    message: "",
    replyTo: "contact@rob-roleofbridge.com",
  });
  const tr = (en: string, ko: string, ja: string, fr: string) =>
    lang === "ko" ? ko : lang === "ja" ? ja : lang === "fr" ? fr : en;
  const defaultArtistTemplate = {
    subject: tr(
      "[ROB] Welcome, Artist — Your Next Opportunity Starts Here",
      "[ROB] 작가님, ROB에 오신 것을 환영합니다",
      "[ROB] アーティストの皆さまへ — ROBへようこそ",
      "[ROB] Bienvenue artiste — Votre prochaine opportunite commence ici"
    ),
    message: tr(
      "Hello,\n\nThank you for joining ROB, a global platform connecting artists and galleries.\nYou can discover open calls, apply internationally, and build your profile to be seen by galleries.\n\nIf you need help setting up your profile or portfolio, reply to this email anytime.\n\nBest regards,\nROB Team",
      "안녕하세요,\n\n글로벌 아트 플랫폼 ROB에 가입해주셔서 감사합니다.\nROB에서는 국내외 오픈콜 탐색, 지원, 포트폴리오 노출을 통해 갤러리와 연결될 수 있습니다.\n\n프로필/포트폴리오 설정이 필요하시면 언제든 회신해주세요.\n\n감사합니다.\nROB 팀",
      "こんにちは。\n\nアーティストとギャラリーをつなぐグローバルプラットフォーム ROB にご登録いただきありがとうございます。\nROB ではオープンコール検索・応募・プロフィール公開を通じて、ギャラリーとの接点を広げられます。\n\nプロフィールやポートフォリオ設定でお困りの際は、いつでもご返信ください。\n\nよろしくお願いいたします。\nROBチーム",
      "Bonjour,\n\nMerci d'avoir rejoint ROB, une plateforme mondiale reliant artistes et galeries.\nVous pouvez decouvrir des open calls, candidater a l'international et valoriser votre profil aupres des galeries.\n\nSi vous souhaitez de l'aide pour votre profil ou portfolio, repondez a cet email a tout moment.\n\nCordialement,\nEquipe ROB"
    ),
  };
  const defaultGalleryTemplate = {
    subject: tr(
      "[ROB] Welcome, Gallery — Meet Global Artists on ROB",
      "[ROB] 갤러리님, ROB에 오신 것을 환영합니다",
      "[ROB] ギャラリーの皆さまへ — ROBへようこそ",
      "[ROB] Bienvenue galerie — Rencontrez des artistes internationaux sur ROB"
    ),
    message: tr(
      "Hello,\n\nThank you for joining ROB.\nYou can publish open calls, discover artist portfolios, and connect with artists worldwide.\n\nIf you'd like, we can help you create your first open call listing.\n\nBest regards,\nROB Team",
      "안녕하세요,\n\nROB에 가입해주셔서 감사합니다.\n갤러리 계정으로 오픈콜 등록, 작가 포트폴리오 탐색, 글로벌 작가와의 연결이 가능합니다.\n\n원하시면 첫 오픈콜 등록을 저희가 도와드리겠습니다.\n\n감사합니다.\nROB 팀",
      "こんにちは。\n\nROB にご登録いただきありがとうございます。\nギャラリーアカウントでは、オープンコール掲載、アーティストポートフォリオ閲覧、世界中の作家との接点づくりが可能です。\n\nご希望であれば初回のオープンコール掲載をサポートいたします。\n\nよろしくお願いいたします。\nROBチーム",
      "Bonjour,\n\nMerci d'avoir rejoint ROB.\nAvec votre compte galerie, vous pouvez publier des open calls, consulter des portfolios d'artistes et echanger avec des artistes du monde entier.\n\nSi vous le souhaitez, nous pouvons vous aider a creer votre premier open call.\n\nCordialement,\nEquipe ROB"
    ),
  };

  const templateForRole = (role: "artist" | "gallery") => {
    const saved = role === "artist" ? savedTemplates.artist : savedTemplates.gallery;
    if (saved?.subject && saved?.message) return saved;
    return role === "artist" ? defaultArtistTemplate : defaultGalleryTemplate;
  };

  const templates = [
    {
      id: "custom",
      name: tr("Custom", "직접 작성", "カスタム", "Personnalise"),
      subject: "",
      message: "",
    },
    {
      id: "partnership",
      name: tr("Partnership Inquiry", "제휴 문의", "パートナーシップ問い合わせ", "Demande de partenariat"),
      subject: tr(
        "[ROB] Partnership Inquiry",
        "[ROB] 제휴 문의",
        "[ROB] パートナーシップのお問い合わせ",
        "[ROB] Demande de partenariat"
      ),
      message: tr(
        "Hello,\n\nThis is ROB (Role of Bridge), a global platform connecting artists and galleries.\nWe would love to explore a partnership opportunity with your team.\n\nIf you are interested, please reply and we can arrange a short call.\n\nBest regards,\nROB Team",
        "안녕하세요.\n\n저희는 전세계 아티스트와 갤러리를 연결하는 ROB(Role of Bridge)입니다.\n귀사와의 제휴 가능성을 논의하고 싶습니다.\n\n관심 있으시면 회신 부탁드리며, 짧은 미팅 일정을 조율하겠습니다.\n\n감사합니다.\nROB 팀",
        "こんにちは。\n\n私たちは世界中のアーティストとギャラリーをつなぐROB（Role of Bridge）です。\n御社とのパートナーシップの可能性についてご相談したくご連絡しました。\n\nご関心がございましたらご返信ください。短い打ち合わせ日程を調整いたします。\n\nよろしくお願いいたします。\nROBチーム",
        "Bonjour,\n\nNous sommes ROB (Role of Bridge), une plateforme mondiale qui connecte artistes et galeries.\nNous aimerions explorer une opportunite de partenariat avec votre equipe.\n\nSi cela vous interesse, repondez a cet email et nous organiserons un court echange.\n\nCordialement,\nEquipe ROB"
      ),
    },
    {
      id: "open_call",
      name: tr("Open Call Invitation", "오픈콜 초대", "オープンコール招待", "Invitation open call"),
      subject: tr(
        "[ROB] Invitation to Post an Open Call",
        "[ROB] 오픈콜 등록 초대",
        "[ROB] オープンコール掲載のご案内",
        "[ROB] Invitation a publier un open call"
      ),
      message: tr(
        "Hello,\n\nWe are reaching out from ROB to invite your gallery to post your open call on our platform.\nArtists from many countries use ROB to discover and apply to exhibitions.\n\nIf you would like, we can help you create your first listing.\n\nBest regards,\nROB Team",
        "안녕하세요.\n\nROB에서 갤러리의 오픈콜을 플랫폼에 등록해보시길 제안드립니다.\n다양한 국가의 작가들이 ROB를 통해 전시 기회를 찾고 지원하고 있습니다.\n\n원하시면 첫 등록을 저희가 도와드리겠습니다.\n\n감사합니다.\nROB 팀",
        "こんにちは。\n\nROBより、貴ギャラリーのオープンコール掲載をご案内します。\n多くの国のアーティストがROBで展示機会を探し、応募しています。\n\nご希望があれば初回掲載をサポートいたします。\n\nよろしくお願いいたします。\nROBチーム",
        "Bonjour,\n\nNous vous contactons depuis ROB pour inviter votre galerie a publier son open call sur notre plateforme.\nDes artistes de nombreux pays utilisent ROB pour trouver et candidater a des expositions.\n\nSi vous le souhaitez, nous pouvons vous aider a creer votre premiere annonce.\n\nCordialement,\nEquipe ROB"
      ),
    },
    {
      id: "artist_reply",
      name: tr("Reply to Applicant", "지원자 회신", "応募者への返信", "Reponse au candidat"),
      subject: tr(
        "[ROB] Thank You for Your Application",
        "[ROB] 지원해주셔서 감사합니다",
        "[ROB] ご応募ありがとうございます",
        "[ROB] Merci pour votre candidature"
      ),
      message: tr(
        "Hello,\n\nThank you for your interest and application.\nWe are reviewing submissions and will get back to you once the evaluation is complete.\n\nBest regards,\nROB Team",
        "안녕하세요.\n\n관심 가져주시고 지원해주셔서 감사합니다.\n현재 접수된 지원서를 검토 중이며, 심사가 완료되면 다시 안내드리겠습니다.\n\n감사합니다.\nROB 팀",
        "こんにちは。\n\nこの度はご関心とご応募をありがとうございます。\n現在応募内容を確認しており、審査完了後にご連絡いたします。\n\nよろしくお願いいたします。\nROBチーム",
        "Bonjour,\n\nMerci pour votre interet et votre candidature.\nNous examinons actuellement les dossiers et reviendrons vers vous apres evaluation.\n\nCordialement,\nEquipe ROB"
      ),
    },
    {
      id: "role_default",
      name: tr("Audience Default (Artist/Gallery)", "대상별 기본 템플릿(작가/갤러리)", "対象別デフォルトテンプレート", "Modele cible par role"),
      subject: "",
      message: "",
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!data?.authenticated) {
          setAuthenticated(false);
          router.replace("/admin/login");
          return;
        }
        setAuthenticated(true);
        await loadLogs();
        await loadUsers();
        await loadSavedTemplates();
      } catch {
        setAuthenticated(false);
        router.replace("/admin/login");
      }
    })();
  }, [router]);

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/mail-logs?limit=60", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } finally {
      setLoadingLogs(false);
    }
  }

  async function loadSavedTemplates() {
    try {
      const res = await fetch("/api/admin/mail-templates", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data?.templates) {
        setSavedTemplates({
          artist: data.templates.artist
            ? {
                subject: String(data.templates.artist.subject || ""),
                message: String(data.templates.artist.message || ""),
              }
            : null,
          gallery: data.templates.gallery
            ? {
                subject: String(data.templates.gallery.subject || ""),
                message: String(data.templates.gallery.message || ""),
              }
            : null,
        });
      }
    } catch {
      // Ignore template load errors to keep mail screen usable.
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.users)) {
        setPlatformUsers(
          data.users.map((u: any) => ({
            id: String(u.id || ""),
            email: String(u.email || ""),
            role: u.role === "gallery" ? "gallery" : "artist",
            name: String(u.name || ""),
            country: String(u.country || ""),
            city: String(u.city || ""),
          }))
        );
      }
    } finally {
      setLoadingUsers(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return platformUsers.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.country.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q)
      );
    });
  }, [platformUsers, roleFilter, userQuery]);

  const roleScopedUsers = useMemo(() => {
    if (roleFilter === "all") return platformUsers;
    return platformUsers.filter((u) => u.role === roleFilter);
  }, [platformUsers, roleFilter]);

  const selectedCount = selectedUserIds.length;

  const allFilteredSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.includes(u.id));

  async function sendMail() {
    if (!form.subject.trim() || !form.message.trim()) {
      setResult(tr("Please fill required fields.", "필수 항목을 입력해주세요.", "必須項目を入力してください。", "Veuillez remplir les champs obligatoires."));
      return;
    }
    if (targetMode === "manual" && !form.to.trim()) {
      setResult(tr("Please enter recipient email.", "수신자 이메일을 입력해주세요.", "宛先メールを入力してください。", "Veuillez saisir l'email destinataire."));
      return;
    }
    if (targetMode === "platform" && recipientMode === "selected" && selectedUserIds.length === 0) {
      setResult(tr("Select at least one user.", "최소 1명 이상 선택하세요.", "少なくとも1人を選択してください。", "Selectionnez au moins un utilisateur."));
      return;
    }
    if (targetMode === "platform" && templateId === "role_default" && roleFilter === "all") {
      setResult(tr("For role-default template, choose artist or gallery filter.", "대상별 기본 템플릿은 작가/갤러리 필터를 선택해서 보내주세요.", "対象別デフォルトテンプレートは作家/ギャラリーフィルタを選択して送信してください。", "Pour ce modele, choisissez d'abord le filtre artiste ou galerie."));
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const roles =
        roleFilter === "all" ? (["artist", "gallery"] as const) : ([roleFilter] as const);
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          targetMode,
          recipientMode,
          roles,
          userIds: targetMode === "platform" ? selectedUserIds : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "send failed");
      if (targetMode === "platform") {
        setResult(
          `${tr("Bulk send completed", "일괄 발송 완료", "一括送信完了", "Envoi groupe termine")} · ${tr("sent", "성공", "送信", "envoyes")}: ${data.sent}/${data.total} · ${tr("failed", "실패", "失敗", "echoues")}: ${data.failed}`
        );
      } else {
        setResult(tr("Email sent successfully.", "이메일 발송 완료.", "メールを送信しました。", "Email envoye avec succes."));
      }
      setForm((p) => ({ ...p, subject: "", message: "", ...(targetMode === "manual" ? {} : { to: "" }) }));
      await loadLogs();
    } catch (e: any) {
      setResult(e?.message || tr("Failed to send email.", "이메일 발송 실패.", "メール送信に失敗しました。", "Echec de l'envoi de l'email."));
    } finally {
      setSending(false);
    }
  }

  async function saveCurrentAsRoleTemplate(role: "artist" | "gallery") {
    if (!form.subject.trim() || !form.message.trim()) {
      setResult(tr("Write subject and message first.", "먼저 제목과 내용을 입력하세요.", "先に件名と本文を入力してください。", "Saisissez d'abord un sujet et un message."));
      return;
    }
    setSavingTemplate(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mail-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role,
          subject: form.subject,
          message: form.message,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "save failed");
      setSavedTemplates((prev) => ({
        ...prev,
        [role]: { subject: form.subject, message: form.message },
      }));
      setResult(
        role === "artist"
          ? tr("Saved as artist default template.", "작가 기본 템플릿으로 저장했습니다.", "作家デフォルトテンプレートとして保存しました。", "Enregistre comme modele artiste par defaut.")
          : tr("Saved as gallery default template.", "갤러리 기본 템플릿으로 저장했습니다.", "ギャラリーデフォルトテンプレートとして保存しました。", "Enregistre comme modele galerie par defaut.")
      );
    } catch (e: any) {
      setResult(e?.message || tr("Failed to save template.", "템플릿 저장 실패.", "テンプレート保存に失敗しました。", "Echec de l'enregistrement du modele."));
    } finally {
      setSavingTemplate(false);
    }
  }

  function applyTemplate(nextId: string) {
    setTemplateId(nextId);
    if (nextId === "role_default") {
      if (roleFilter === "all") {
        setResult(tr("Choose artist or gallery filter first.", "먼저 작가/갤러리 필터를 선택하세요.", "先に作家/ギャラリーフィルタを選択してください。", "Choisissez d'abord le filtre artiste ou galerie."));
        return;
      }
      const selected = templateForRole(roleFilter);
      setForm((p) => ({ ...p, subject: selected.subject, message: selected.message }));
      return;
    }
    const selected = templates.find((t) => t.id === nextId);
    if (!selected || nextId === "custom") return;
    setForm((p) => ({ ...p, subject: selected.subject, message: selected.message }));
  }

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFBF7" }}>
        <p style={{ fontFamily: F, fontSize: 13, color: "#B0AAA2" }}>
          {tr("Authenticating...", "인증 중...", "認証中...", "Authentification...")}
        </p>
      </main>
    );
  }
  if (!authenticated) return null;

  return (
    <>
      <AdminTopBar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8B7355" }}>
            {tr("Admin", "관리자", "管理者", "Admin")}
          </span>
          <h1 style={{ fontFamily: S, fontSize: 40, fontWeight: 300, marginTop: 8 }}>
            {tr("Send Email", "메일 보내기", "メール送信", "Envoyer un email")}
          </h1>
        </div>

        <div
          style={{
            border: "1px solid #E8E3DB",
            background: "#FAF8F4",
            padding: "14px 16px",
            marginBottom: 14,
            fontFamily: F,
            fontSize: 12,
            color: "#6F6A64",
            lineHeight: 1.6,
          }}
        >
          {tr(
            "Deliverability tip: keep SPF, DKIM, and DMARC configured in DNS for stable inbox delivery.",
            "전달성 안내: 받은편지함 도달률을 높이려면 DNS에서 SPF, DKIM, DMARC를 함께 유지하세요.",
            "到達性のヒント: 受信トレイ到達率を高めるため、DNS で SPF・DKIM・DMARC を維持してください。",
            "Conseil de delivrabilite : maintenez SPF, DKIM et DMARC dans le DNS pour une meilleure reception en boite de reception."
          )}
        </div>

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 24, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setTargetMode("platform")}
              style={{ ...modeBtn, borderColor: targetMode === "platform" ? "#1A1A1A" : "#E8E3DB", background: targetMode === "platform" ? "#1A1A1A" : "#FFFFFF", color: targetMode === "platform" ? "#FFFFFF" : "#8A8580" }}
            >
              {tr("Platform users", "플랫폼 사용자", "プラットフォームユーザー", "Utilisateurs plateforme")}
            </button>
            <button
              onClick={() => setTargetMode("manual")}
              style={{ ...modeBtn, borderColor: targetMode === "manual" ? "#1A1A1A" : "#E8E3DB", background: targetMode === "manual" ? "#1A1A1A" : "#FFFFFF", color: targetMode === "manual" ? "#FFFFFF" : "#8A8580" }}
            >
              {tr("Manual recipient", "직접 수신자", "手動宛先", "Destinataire manuel")}
            </button>
          </div>

          {targetMode === "platform" && (
            <div style={{ border: "1px solid #E8E3DB", background: "#FAF8F4", padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setRecipientMode("all")} style={{ ...smallBtn, borderColor: recipientMode === "all" ? "#1A1A1A" : "#E8E3DB", background: recipientMode === "all" ? "#1A1A1A" : "#FFFFFF", color: recipientMode === "all" ? "#FFFFFF" : "#8A8580" }}>
                  {tr("Select all", "전체 선택", "全体選択", "Tout selectionner")}
                </button>
                <button onClick={() => setRecipientMode("selected")} style={{ ...smallBtn, borderColor: recipientMode === "selected" ? "#1A1A1A" : "#E8E3DB", background: recipientMode === "selected" ? "#1A1A1A" : "#FFFFFF", color: recipientMode === "selected" ? "#FFFFFF" : "#8A8580" }}>
                  {tr("Individual select", "개별 선택", "個別選択", "Selection individuelle")}
                </button>
                <span style={{ fontFamily: F, fontSize: 11, color: "#8A8580" }}>
                  {tr("Selected", "선택", "選択", "Selectionnes")}: {recipientMode === "all" ? roleScopedUsers.length : selectedCount}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setRoleFilter("all")} style={{ ...smallBtn, borderColor: roleFilter === "all" ? "#1A1A1A" : "#E8E3DB", background: roleFilter === "all" ? "#1A1A1A" : "#FFFFFF", color: roleFilter === "all" ? "#FFFFFF" : "#8A8580" }}>ALL</button>
                <button onClick={() => setRoleFilter("artist")} style={{ ...smallBtn, borderColor: roleFilter === "artist" ? "#1A1A1A" : "#E8E3DB", background: roleFilter === "artist" ? "#1A1A1A" : "#FFFFFF", color: roleFilter === "artist" ? "#FFFFFF" : "#8A8580" }}>{tr("Artists", "작가", "作家", "Artistes")}</button>
                <button onClick={() => setRoleFilter("gallery")} style={{ ...smallBtn, borderColor: roleFilter === "gallery" ? "#1A1A1A" : "#E8E3DB", background: roleFilter === "gallery" ? "#1A1A1A" : "#FFFFFF", color: roleFilter === "gallery" ? "#FFFFFF" : "#8A8580" }}>{tr("Galleries", "갤러리", "ギャラリー", "Galeries")}</button>
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={tr("Search user/email/country...", "사용자/이메일/국가 검색...", "ユーザー/メール/国を検索...", "Recherche utilisateur/email/pays...")}
                  style={{ ...inp, maxWidth: 320, padding: "8px 10px" }}
                />
              </div>

              {recipientMode === "selected" && (
                <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", maxHeight: 220, overflow: "auto" }}>
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #F0EBE3", display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...filteredUsers.map((u) => u.id)])));
                        } else {
                          const filteredSet = new Set(filteredUsers.map((u) => u.id));
                          setSelectedUserIds(selectedUserIds.filter((id) => !filteredSet.has(id)));
                        }
                      }}
                    />
                    <span style={{ fontFamily: F, fontSize: 11, color: "#6F6A64" }}>
                      {tr("Select all in current filter", "현재 필터 전체 선택", "現在フィルタを全選択", "Tout selectionner dans le filtre")}
                    </span>
                  </div>
                  {loadingUsers ? (
                    <div style={{ padding: 12, fontFamily: F, fontSize: 11, color: "#B0AAA2" }}>...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: 12, fontFamily: F, fontSize: 11, color: "#B0AAA2" }}>
                      {tr("No users found.", "사용자가 없습니다.", "ユーザーがいません。", "Aucun utilisateur.")}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 1, background: "#F5F1EB" }}>
                      {filteredUsers.slice(0, 400).map((u) => (
                        <label key={u.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "#FFFFFF" }}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedUserIds(Array.from(new Set([...selectedUserIds, u.id])));
                              else setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                            }}
                          />
                          <span style={{ fontFamily: F, fontSize: 11, color: "#1A1A1A" }}>
                            [{u.role}] {u.name || "-"} · {u.email} {u.country ? `· ${u.country}/${u.city || "-"}` : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <label style={labelStyle}>
            {tr("Template", "템플릿", "テンプレート", "Modele")}
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} style={inp}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {targetMode === "platform" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => {
                  const t = templateForRole("artist");
                  setTemplateId("role_default");
                  setForm((p) => ({ ...p, subject: t.subject, message: t.message }));
                }}
                style={smallBtn}
              >
                {tr("Load artist default", "작가 기본 불러오기", "作家デフォルト読込", "Charger modele artiste")}
              </button>
              <button
                onClick={() => {
                  const t = templateForRole("gallery");
                  setTemplateId("role_default");
                  setForm((p) => ({ ...p, subject: t.subject, message: t.message }));
                }}
                style={smallBtn}
              >
                {tr("Load gallery default", "갤러리 기본 불러오기", "ギャラリーデフォルト読込", "Charger modele galerie")}
              </button>
              <button
                onClick={() => saveCurrentAsRoleTemplate("artist")}
                disabled={savingTemplate}
                style={{ ...smallBtn, opacity: savingTemplate ? 0.7 : 1 }}
              >
                {tr("Save as artist default", "현재 내용을 작가 기본으로 저장", "現在内容を作家デフォルト保存", "Enregistrer comme modele artiste")}
              </button>
              <button
                onClick={() => saveCurrentAsRoleTemplate("gallery")}
                disabled={savingTemplate}
                style={{ ...smallBtn, opacity: savingTemplate ? 0.7 : 1 }}
              >
                {tr("Save as gallery default", "현재 내용을 갤러리 기본으로 저장", "現在内容をギャラリーデフォルト保存", "Enregistrer comme modele galerie")}
              </button>
            </div>
          ) : null}

          {targetMode === "manual" && (
            <label style={labelStyle}>
              {tr("Recipient", "수신자", "宛先", "Destinataire")}
              <input value={form.to} onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))} placeholder="gallery@example.com" style={inp} />
            </label>
          )}

          <label style={labelStyle}>
            {tr("Reply-To", "회신 주소", "返信先", "Adresse de reponse")}
            <input value={form.replyTo} onChange={(e) => setForm((p) => ({ ...p, replyTo: e.target.value }))} placeholder="contact@rob-roleofbridge.com" style={inp} />
          </label>

          <label style={labelStyle}>
            {tr("Subject", "제목", "件名", "Sujet")}
            <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} style={inp} />
          </label>

          <label style={labelStyle}>
            {tr("Message", "메시지", "メッセージ", "Message")}
            <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} style={{ ...inp, minHeight: 220, resize: "vertical" }} />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={sendMail}
              disabled={sending}
              style={{
                padding: "11px 20px",
                border: "1px solid #1A1A1A",
                background: "#1A1A1A",
                color: "#FFFFFF",
                fontFamily: F,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: sending ? "wait" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending
                ? tr("Sending...", "전송 중...", "送信中...", "Envoi...")
                : targetMode === "platform"
                  ? tr("Send to selected users", "선택 사용자에게 발송", "選択ユーザーへ送信", "Envoyer aux utilisateurs")
                  : tr("Send Email", "메일 발송", "メール送信", "Envoyer")}
            </button>

            {result ? <span style={{ fontFamily: F, fontSize: 12, color: "#6A6A6A" }}>{result}</span> : null}
          </div>
        </div>

        <div style={{ border: "1px solid #E8E3DB", background: "#FFFFFF", padding: 18, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: F, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8580" }}>
              {tr("Recent Email Logs", "최근 메일 로그", "最近のメールログ", "Logs email recents")}
            </div>
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              style={{
                border: "1px solid #E8E3DB",
                background: "transparent",
                color: "#4A4A4A",
                fontFamily: F,
                fontSize: 10,
                padding: "6px 10px",
                cursor: loadingLogs ? "wait" : "pointer",
              }}
            >
              {loadingLogs ? "..." : tr("Refresh", "새로고침", "更新", "Actualiser")}
            </button>
          </div>
          {logs.length === 0 ? (
            <div style={{ fontFamily: F, fontSize: 12, color: "#B0AAA2", padding: "8px 0" }}>
              {tr("No logs yet.", "아직 로그가 없습니다.", "ログがありません。", "Aucun log pour le moment.")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {logs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: "1px solid #F0EBE3",
                    background: "#FAF8F4",
                    padding: "10px 12px",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: F, fontSize: 11, color: "#1A1A1A" }}>
                      {log.emailType} · {log.toEmail}
                    </span>
                    <span style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 11, color: "#4A4A4A" }}>{log.subject}</div>
                  <div style={{ fontFamily: F, fontSize: 10, color: log.status === "failed" ? "#8B4A4A" : "#5A7A5A" }}>
                    {log.status}
                    {log.error ? ` · ${log.error}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

const labelStyle = {
  display: "grid",
  gap: 6,
  fontFamily: F,
  fontSize: 11,
  color: "#8A8580",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

const inp = {
  width: "100%",
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#1A1A1A",
  padding: "10px 12px",
  fontFamily: F,
  fontSize: 13,
  lineHeight: 1.6,
  outline: "none",
  textTransform: "none",
  letterSpacing: "normal",
} as const;

const modeBtn = {
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  padding: "8px 10px",
  fontFamily: F,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
} as const;

const smallBtn = {
  border: "1px solid #E8E3DB",
  background: "#FFFFFF",
  color: "#8A8580",
  padding: "6px 8px",
  fontFamily: F,
  fontSize: 10,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
} as const;

