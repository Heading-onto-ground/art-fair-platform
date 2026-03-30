"use client";

import { useRef, useState } from "react";
import { F, colors } from "@/lib/design";

type Props = {
  currentImage?: string | null;
  onUploaded: (url: string) => void;
  size?: number;
};

export default function ProfileImageUpload({ currentImage, onUploaded, size = 120 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB)");
      return;
    }

    setUploading(true);

    try {
      // 1. Vercel Blob 업로드 시도
      const formData = new FormData();
      formData.append("file", file);

      const blobRes = await fetch("/api/profile/image/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const blobData = await blobRes.json().catch(() => null);

      if (blobRes.ok && blobData?.ok && blobData?.url) {
        // Vercel Blob 성공
        setPreview(blobData.url);
        onUploaded(blobData.url);
        return;
      }

      // 2. Fallback: base64 방식 (BLOB_READ_WRITE_TOKEN 미설정 시)
      if (blobData?.fallback) {
        const dataUri = await resizeImage(file, 400, 400, 0.85);
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
      // input 초기화 (같은 파일 재선택 가능하도록)
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
              Photo
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
        {uploading ? "Uploading..." : preview ? "Change Photo" : "Upload Photo"}
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
    </div>
  );
}

/** Resize image to max dimensions and return base64 data URI (fallback용) */
function resizeImage(file: File, maxW: number, maxH: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
