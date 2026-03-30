import { canAccessRoom, getMessages } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/[roomId]/sse
 *
 * Server-Sent Events 엔드포인트 — 실시간 채팅 메시지 수신
 *
 * 클라이언트가 연결하면:
 * 1. 최신 메시지 lastId 이후의 새 메시지를 2초마다 폴링
 * 2. 새 메시지가 있으면 SSE 이벤트로 전송
 * 3. 연결이 끊기면 interval 정리
 *
 * WebSocket 대신 SSE를 사용하는 이유:
 * - 추가 패키지 불필요
 * - Vercel Edge/Serverless에서 동작
 * - HTTP/2 멀티플렉싱으로 효율적
 */
async function getSessionFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/me`,
      {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => null);
    return data?.session ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;
  const cookieHeader = req.headers.get("cookie");

  const session = await getSessionFromCookie(cookieHeader);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ok = await canAccessRoom(roomId, session.userId, session.role);
  if (!ok) {
    return new Response("Forbidden", { status: 403 });
  }

  // 현재 마지막 메시지 ID (새 메시지 감지 기준)
  const initial = await getMessages(roomId);
  let lastId = initial.length > 0 ? initial[initial.length - 1].id : "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 연결 확인용 초기 ping
      controller.enqueue(encoder.encode(`event: connected\ndata: {"roomId":"${roomId}"}\n\n`));

      const interval = setInterval(async () => {
        try {
          // lastId 이후의 새 메시지 조회
          const newMessages = await prisma.message.findMany({
            where: {
              roomId,
              ...(lastId ? { id: { gt: lastId } } : {}),
            },
            orderBy: { createdAt: "asc" },
          });

          if (newMessages.length > 0) {
            lastId = newMessages[newMessages.length - 1].id;
            const payload = JSON.stringify(newMessages.map((m: { id: string; senderId: string; senderRole: string; text: string; createdAt: Date }) => ({
              id: m.id,
              senderId: m.senderId,
              senderRole: m.senderRole,
              text: m.text,
              createdAt: m.createdAt.getTime(),
            })));
            controller.enqueue(encoder.encode(`event: messages\ndata: ${payload}\n\n`));
          } else {
            // 연결 유지용 heartbeat
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          }
        } catch {
          // DB 오류 시 스트림 종료
          clearInterval(interval);
          controller.close();
        }
      }, 2000); // 2초 간격 폴링

      // 클라이언트가 연결을 끊으면 정리
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx 버퍼링 비활성화
    },
  });
}
