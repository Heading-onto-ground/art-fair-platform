"use client";

import { useRef, useState } from "react";
import { F } from "@/lib/design";

type Props = {
  currentImage?: string | null;
  onUploaded: (dataUri: string) => void;
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

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate size (max 2MB original, will be resized)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image too large (max 2MB)");
      return;
    }

    setUploading(true);

    try {
      // Resize image client-side
      const dataUri = await resizeImage(file, 400, 400, 0.85);
      setPreview(dataUri);

      // Upload to server
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
    } catch (err) {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid #E8E3DB",
          overflow: "hidden",
          cursor: uploading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: preview ? "transparent" : "#F5F1EB",
          transition: "border-color 0.3s",
          position: "relative",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B7355"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E3DB"; }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, color: "#D4CEC4", marginBottom: 4 }}>+</div>
            <div style={{ fontFamily: F, fontSize: 8, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B0AAA2" }}>
              Photo
            </div>
          </div>
        )}

        {uploading && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(253,251,247,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
          }}>
            <div style={{ fontFamily: F, fontSize: 10, color: "#8B7355" }}>...</div>
          </div>
        )}
      </div>

      <button
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: "8px 16px",
          border: "1px solid #E8E3DB",
          background: "transparent",
          color: "#8A8580",
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
        <div style={{ fontFamily: F, fontSize: 11, color: "#8B4A4A", textAlign: "center" }}>{error}</div>
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

/** Resize image to max dimensions and return base64 data URI */
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
