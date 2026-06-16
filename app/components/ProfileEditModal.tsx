"use client";

import { useEffect, useState } from "react";
import { F, colors } from "@/lib/design";
import ProfileImageUpload from "@/app/components/ProfileImageUpload";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: string;
  profileImage: string | null | undefined;
  bio: string | null | undefined;
  onSaved: (data: { profileImage?: string | null; bio?: string | null }) => void;
};

export default function ProfileEditModal({ open, onClose, lang, profileImage, bio, onSaved }: Props) {
  const ko = lang === "ko";
  const [draftBio, setDraftBio] = useState(bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState(profileImage ?? null);

  useEffect(() => {
    if (open) {
      setDraftBio(bio ?? "");
      setImage(profileImage ?? null);
      setError(null);
    }
  }, [open, bio, profileImage]);

  if (!open) return null;

  async function saveBio() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio: draftBio.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || (ko ? "저장에 실패했습니다." : "Save failed"));
        return;
      }
      onSaved({ bio: draftBio.trim() || null, profileImage: image });
      onClose();
    } catch {
      setError(ko ? "저장에 실패했습니다." : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "88vh",
          overflowY: "auto",
          background: colors.bgCard,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: "20px 20px 28px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
            {ko ? "프로필 편집" : "Edit profile"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", fontSize: 20, color: colors.textMuted, cursor: "pointer", lineHeight: 1 }}
            aria-label={ko ? "닫기" : "Close"}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <ProfileImageUpload
            currentImage={image}
            lang={lang}
            size={96}
            onUploaded={(url) => {
              setImage(url);
              onSaved({ profileImage: url, bio: draftBio.trim() || null });
            }}
          />
        </div>

        <label style={{ display: "block", marginBottom: 8 }}>
          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textMuted }}>
            {ko ? "자기소개" : "Bio"}
          </span>
          <textarea
            value={draftBio}
            onChange={(e) => setDraftBio(e.target.value)}
            placeholder={ko ? "작업 방향, 관심사, 한 줄 소개를 적어주세요." : "A short intro about you and your work."}
            rows={4}
            maxLength={300}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "12px 14px",
              border: `1px solid ${colors.border}`,
              background: colors.bgPrimary,
              fontFamily: F,
              fontSize: 13,
              lineHeight: 1.6,
              color: colors.textPrimary,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </label>
        <p style={{ fontFamily: F, fontSize: 10, color: colors.textLight, margin: "4px 0 0", textAlign: "right" }}>
          {draftBio.length}/300
        </p>

        {error && (
          <p style={{ fontFamily: F, fontSize: 12, color: colors.error, margin: "12px 0 0" }}>{error}</p>
        )}

        <button
          type="button"
          onClick={saveBio}
          disabled={saving}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "12px",
            border: "none",
            background: colors.textPrimary,
            color: colors.bgPrimary,
            fontFamily: F,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (ko ? "저장 중…" : "Saving…") : ko ? "저장" : "Save"}
        </button>
      </div>
    </div>
  );
}
