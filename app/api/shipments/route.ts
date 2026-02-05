import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getCarrierByCode, getTrackingUrl } from "@/lib/carriers";

export const dynamic = "force-dynamic";

// GET /api/shipments - 내 배송 목록 조회
export async function GET(req: Request) {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    // 아티스트: 내가 신청한 배송
    // 갤러리: 내게 오는 배송
    const whereClause =
      session.role === "artist"
        ? { application: { artistId: session.userId } }
        : { application: { galleryId: session.userId } };

    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      include: {
        application: true,
        events: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 추적 URL 추가
    const shipmentsWithUrls = shipments.map((s) => ({
      ...s,
      trackingUrl: s.trackingNumber ? getTrackingUrl(s.carrier, s.trackingNumber) : null,
    }));

    return NextResponse.json({ ok: true, shipments: shipmentsWithUrls });
  } catch (e) {
    console.error("GET /api/shipments error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

// POST /api/shipments - 배송 예약 생성
export async function POST(req: Request) {
  const session = getServerSession();
  if (!session || session.role !== "artist") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      applicationId,
      carrier,
      type,
      pickupDate,
      pickupTime,
      pickupAddress,
      pickupContact,
      pickupNote,
      deliveryAddress,
      deliveryContact,
      artworkTitle,
      artworkSize,
      artworkWeight,
      packageCount,
      insured,
      insuranceValue,
    } = body;

    // 필수 필드 검증
    if (!applicationId || !carrier || !pickupAddress || !pickupContact || !deliveryAddress || !deliveryContact) {
      return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
    }

    // 배송 업체 검증
    const carrierInfo = getCarrierByCode(carrier);
    if (!carrierInfo) {
      return NextResponse.json({ ok: false, error: "invalid carrier" }, { status: 400 });
    }

    // Application 확인 (본인 것인지 + accepted 상태인지)
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ ok: false, error: "application not found" }, { status: 404 });
    }

    if (application.artistId !== session.userId) {
      return NextResponse.json({ ok: false, error: "not your application" }, { status: 403 });
    }

    if (application.status !== "accepted") {
      return NextResponse.json({ ok: false, error: "application not accepted yet" }, { status: 400 });
    }

    // 이미 배송이 있는지 확인
    const existingShipment = await prisma.shipment.findUnique({
      where: { applicationId },
    });

    if (existingShipment) {
      return NextResponse.json({ ok: false, error: "shipment already exists" }, { status: 400 });
    }

    // 배송 생성
    const shipment = await prisma.shipment.create({
      data: {
        applicationId,
        type: type || "local",
        carrier,
        carrierName: carrierInfo.name,
        status: "scheduled",
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        pickupTime,
        pickupAddress,
        pickupContact,
        pickupNote,
        deliveryAddress,
        deliveryContact,
        artworkTitle,
        artworkSize,
        artworkWeight,
        packageCount: packageCount || 1,
        insured: insured || false,
        insuranceValue,
      },
    });

    // 이벤트 기록
    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: "scheduled",
        description: `배송 예약이 생성되었습니다. 업체: ${carrierInfo.nameKo}`,
      },
    });

    return NextResponse.json({ ok: true, shipment });
  } catch (e) {
    console.error("POST /api/shipments error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
