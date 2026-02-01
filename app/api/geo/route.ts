import { NextResponse } from "next/server";

function getClientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (lat && lng) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "art-fair-platform/1.0",
        },
      });
      const data = await res.json().catch(() => null);
      const address = data?.address ?? {};
      const country = address?.country ?? null;
      const city =
        address?.city ??
        address?.town ??
        address?.village ??
        address?.state ??
        null;
      return NextResponse.json({ country, city });
    }

    const ip = getClientIp(req);
    const ipUrl = `http://ip-api.com/json/${encodeURIComponent(
      ip || ""
    )}?fields=status,country,city,message`;
    const ipRes = await fetch(ipUrl);
    const ipData = await ipRes.json().catch(() => null);
    if (ipData?.status !== "success") {
      return NextResponse.json({ country: null, city: null });
    }
    return NextResponse.json({
      country: ipData.country ?? null,
      city: ipData.city ?? null,
    });
  } catch (e) {
    console.error("GET /api/geo failed:", e);
    return NextResponse.json({ country: null, city: null });
  }
}
