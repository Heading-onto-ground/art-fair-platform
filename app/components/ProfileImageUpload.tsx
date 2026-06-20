"use client";

import { useEffect, useRef, useState } from "react";
import { F, colors } from "@/lib/design";
import { fileToDataUrl } from "@/lib/imageCrop";
import ImageCropEditor from "@/app/components/ImageCropEditor";

type Props = {
  currentImage?: string | null;
  onUploaded: (url: string) => void;
  size?: number;
  lang?: string;
};

export default function ProfileImageUpload({ currentImage, onUploaded, size = 120, lang = "en" }: Props) {
  const ko = lang === "ko";
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);

  useEffect(() => {
    setPreview(currentImage ?? null);
  }, [currentImage]);

  async function uploadDataUri(dataUri: string) {
    setUploading(true);
    setError(null);
    try {
      const blob = await fetch(dataUri).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");

      const blobRes = await fetch("/api/profile/image/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const blobData = await blobRes.json().catch(() => null);

      if (blobRes.ok && blobData?.ok && blobData?.url) {
        setPreview(blobData.url);
        onUploaded(blobData.url);
        return;
      }

      if (blobData?.fallback) {
        setPreview(dataUri);
        const res = await fetch("/api/profile/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ image: dataUri }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setError(data?.error || "Upload failed");
          return;
        }
        onUploaded(dataUri);
        return;
      }

      setError(blobData?.error || "Upload failed");
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError(ko ? "이미지 파일을 선택해주세요." : "Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(ko ? "이미지가 너무 큽니다 (최대 5MB)." : "Image too large (max 5MB)");
      return;
    }

    try {
      setCropSource(await fileToDataUrl(file));
    } catch {
      setError(ko ? "이미지 처리 실패" : "Failed to process image");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // 이미지가 URL인지 base64인지 판별
  const isExternalUrl = preview && (preview.startsWith("http://") || preview.startsWith("https://"));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${colors.border}`,
          overflow: "hidden",
          cursor: uploading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: preview ? "transparent" : colors.bgSecondary,
          transition: "border-color 0.3s",
          position: "relative",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            referrerPolicy={isExternalUrl ? "no-referrer" : undefined}
          />
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, color: colors.borderDark, marginBottom: 4 }}>+</div>
            <div style={{ fontFamily: F, fontSize: 8, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textLight }}>
              {ko ? "사진" : "Photo"}
            </div>
          </div>
        )}

        {uploading && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(253,251,247,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
          }}>
            <div style={{ fontFamily: F, fontSize: 10, color: colors.accent }}>...</div>
          </div>
        )}
      </div>

      <button
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: "8px 16px",
          border: `1px solid ${colors.border}`,
          background: "transparent",
          color: colors.textMuted,
          fontFamily: F,
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: uploading ? "wait" : "pointer",
        }}
      >
        {uploading ? (ko ? "업로드 중…" : "Uploading…") : preview ? (ko ? "사진 변경" : "Change Photo") : ko ? "사진 추가" : "Upload Photo"}
      </button>

      {error && (
        <div style={{ fontFamily: F, fontSize: 11, color: colors.error, textAlign: "center", maxWidth: size + 40 }}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {cropSource && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 max(16px, env(safe-area-inset-bottom))" }}
        >
          <div style={{ width: "100%", maxWidth: 420, borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
            <ImageCropEditor
              src={cropSource}
              lang={lang}
              outputMax={800}
              quality={0.85}
              onApply={async (dataUrl) => {
                setCropSource(null);
                await uploadDataUri(dataUrl);
              }}
              onCancel={() => setCropSource(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
