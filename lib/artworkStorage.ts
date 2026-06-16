const MAX_DATA_URI_BYTES = 1_800_000;

export async function storeArtworkImage(
  userId: string,
  imageUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const trimmed = imageUrl.trim();
  if (!trimmed) return { ok: false, error: "image required" };

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { ok: true, url: trimmed };
  }

  if (!trimmed.startsWith("data:image/")) {
    return { ok: false, error: "invalid image format" };
  }

  if (trimmed.length > MAX_DATA_URI_BYTES) {
    return { ok: false, error: "image too large" };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return { ok: false, error: "invalid image data" };

      const mime = match[1];
      const bytes = Buffer.from(match[2], "base64");
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const filename = `artworks/${userId}-${Date.now()}.${ext}`;

      const blob = await put(filename, bytes, {
        access: "public",
        contentType: mime,
      });

      return { ok: true, url: blob.url };
    } catch {
      // fall through to data URI storage
    }
  }

  return { ok: true, url: trimmed };
}
