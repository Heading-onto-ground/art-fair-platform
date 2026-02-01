import { NextResponse } from "next/server";

export async function POST() {
  // 프로젝트에서 쓰는 세션 쿠키 이름이 다를 수 있어서
  // 대표 후보들을 한 번에 지움 (MVP에서 제일 안전한 방식)
  const res = NextResponse.json({ ok: true });

  const cookieNames = ["afp_session", "session", "token", "auth", "sid"];

  for (const name of cookieNames) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}