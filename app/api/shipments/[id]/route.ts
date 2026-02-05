import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getTrackingUrl, SHIPMENT_STATUS_KO } from "@/lib/carriers";

export const dynamic = "force-dynamic";

// GET /api/shipments/[id] - 배송 상세 조회
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: {
        application: true,
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 권한 확인
    const isArtist = shipment.application.artistId === session.userId;
    const isGallery = shipment.application.galleryId === session.userId;

    if (!isArtist && !isGallery) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 추적 URL 추가
    const trackingUrl = shipment.trackingNumber
      ? getTrackingUrl(shipment.carrier, shipment.trackingNumber)
      : null;

    return NextResponse.json({
      ok: true,
      shipment: { ...shipment, trackingUrl },
    });
  } catch (e) {
    console.error("GET /api/shipments/[id] error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

// PATCH /api/shipments/[id] - 배송 상태 업데이트
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status, trackingNumber, location, description } = body;

    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: { application: true },
    });

    if (!shipment) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 권한 확인 (아티스트 또는 갤러리)
    const isArtist = shipment.application.artistId === session.userId;
    const isGallery = shipment.application.galleryId === session.userId;

    if (!isArtist && !isGallery) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 업데이트 데이터 준비
    const updateData: any = {};

    if (status) {
      updateData.status = status;

      if (status === "picked_up") {
        updateData.pickedUpAt = new Date();
      } else if (status === "delivered") {
        updateData.deliveredAt = new Date();
      }
    }

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
      updateData.trackingUrl = getTrackingUrl(shipment.carrier, trackingNumber);
    }

    // 배송 업데이트
    const updated = await prisma.shipment.update({
      where: { id: params.id },
      data: updateData,
    });

    // 이벤트 기록
    if (status) {
      await prisma.shipmentEvent.create({
        data: {
          shipmentId: params.id,
          status,
          location,
          description: description || SHIPMENT_STATUS_KO[status] || status,
        },
      });
    }

    return NextResponse.json({ ok: true, shipment: updated });
  } catch (e) {
    console.error("PATCH /api/shipments/[id] error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

// DELETE /api/shipments/[id] - 배송 예약 취소
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: { application: true },
    });

    if (!shipment) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // 아티스트만 취소 가능
    if (shipment.application.artistId !== session.userId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 이미 픽업된 경우 취소 불가
    if (["picked_up", "in_transit", "delivered"].includes(shipment.status)) {
      return NextResponse.json({ ok: false, error: "cannot cancel after pickup" }, { status: 400 });
    }

    await prisma.shipment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/shipments/[id] error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
