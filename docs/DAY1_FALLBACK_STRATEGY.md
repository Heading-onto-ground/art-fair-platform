# Day 1 대체 전략 (Fallback Strategy)

**상황**: api/auth/me에서 profile.artistId가 안 오거나, 모바일에서 credentials(쿠키)가 전달되지 않는 경우

---

## 1. artistId가 안 올 때

### 1.1 원인 패턴

| 패턴 | 원인 | 대응 |
|------|------|------|
| profile === null | 작가 프로필 미생성 (ArtistProfile 레코드 없음) | 로그인 후 프로필 생성 유도 |
| profile 있으나 artistId 없음 | DB 스키마/쿼리 이슈 | getProfileByUserId 반환값 확인 |
| role !== "artist" | 갤러리/큐레이터 로그인 | artist 전용 기능 비활성화 |

### 1.2 대체 방안 A: userId → artistId 추정

- **조건**: userId와 artistId가 동일하거나, 1:1 매핑인 환경
- **구현**: `profile?.artistId ?? session?.userId` 사용
- **주의**: 실제로 ArtistProfile.artistId와 User.id가 다를 수 있음. DB 확인 필요.

### 1.3 대체 방안 B: artistId 조회 API 추가

- **엔드포인트**: `GET /api/artist/me/artist-id`
- **응답**: `{ artistId: string }` 또는 `{ error: "profile_required" }`
- **용도**: session만 있으면 artistId를 별도 조회

### 1.4 대체 방안 C: 로그인 응답에 artistId 포함

- **수정**: `POST /api/auth/login` 성공 시 `{ session, profile: { artistId } }` 반환
- **모바일**: 로그인 시 artistId를 AsyncStorage에 저장, 이후 API 호출 시 사용

---

## 2. credentials(쿠키) 미동작 시

### 2.1 원인

- **sameSite: "lax"**: cross-origin 요청에서 쿠키 미전송
- **Expo Go / React Native**: 웹과 다른 cookie 저장소, cross-origin 시 제한

### 2.2 대체 방안 A: 쿠키 설정 변경

- **수정**: `app/api/auth/login/route.ts`
- **변경**: `sameSite: "none"`, `secure: true` (HTTPS 필수)
- **주의**: CSRF 대응 필요. SameSite=None이면 cross-site 요청에서도 쿠키 전송됨.

```ts
res.cookies.set("afp_session", createSignedSessionValue({ userId, role, email }), {
  httpOnly: true,
  sameSite: "none",  // cross-origin 허용
  secure: true,      // HTTPS 필수
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
```

### 2.3 대체 방안 B: Bearer 토큰 전환

- **흐름**:
  1. 로그인 성공 시 `{ session, accessToken }` 반환
  2. 모바일: accessToken을 AsyncStorage에 저장
  3. API 호출 시 `Authorization: Bearer <token>` 헤더 추가
  4. 백엔드: 쿠키 없을 때 Authorization 헤더에서 세션 복원

- **구현 단계**:
  1. `lib/session.ts`에 `verifyBearerToken(token)` 추가 (또는 JWT 검증)
  2. `lib/auth.ts`의 `getServerSession`에서 `req.headers.get("Authorization")` 확인
  3. API 라우트에서 Request 객체를 getServerSession에 전달하도록 수정 (Next.js App Router는 `cookies()` 외에 `headers()` 사용 가능)

- **Next.js App Router**:
  - `cookies()`는 요청의 Cookie 헤더에서 읽음
  - `headers()`에서 `Authorization` 읽어서 토큰 검증 가능

### 2.4 대체 방안 C: 세션 ID를 쿼리/헤더로 전달 (비권장)

- 모바일이 세션 ID를 `X-Session-Id` 헤더로 전달
- 보안상 권장하지 않음. Bearer 토큰이 더 표준적.

---

## 3. 권장 적용 순서

1. **즉시**: Day 1 검증 실행 → 결과 확인
2. **artistId 없음**: 1.4 (로그인 응답에 artistId 포함) — 변경 범위 작음
3. **쿠키 미동작**: 2.2 (sameSite: "none") 시도 → 실패 시 2.3 (Bearer 토큰)

---

## 4. Bearer 토큰 전환 시 상세

### 4.1 로그인 응답 확장

```ts
// POST /api/auth/login 성공 시
return NextResponse.json({
  ok: true,
  session: { userId, role, email },
  accessToken: createAccessToken({ userId, role, email }), // JWT 또는 signed payload
});
```

### 4.2 getServerSession 수정

```ts
export function getServerSession(req?: Request): Session | null {
  // 1. Authorization: Bearer <token>
  const auth = req?.headers?.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    const verified = verifyAccessToken(token);
    if (verified) return verified;
  }
  // 2. Cookie fallback
  const raw = cookies().get(COOKIE_NAME)?.value;
  // ...
}
```

### 4.3 모바일 API 호출

```ts
const token = await AsyncStorage.getItem("@rob_access_token");
fetch(url, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  credentials: "include", // 쿠키도 함께 시도
});
```

### 4.4 Next.js Route Handler에서 Request 전달

- `GET(req: Request)` 에서 `getServerSession(req)` 호출
- `cookies()`는 Async이므로 `getServerSession`이 `headers()`를 사용하도록 수정 필요
- Next.js 15: `headers()`는 `Promise<Headers>`일 수 있음 — 버전 확인

---

## 5. 체크리스트 (대체 전략 적용 시)

- [ ] artistId 대체: 로그인 응답에 artistId 포함 또는 /api/artist/me/artist-id 추가
- [ ] 쿠키: sameSite=none 시도 또는 Bearer 토큰 도입
- [ ] 모바일: 토큰 저장 및 Authorization 헤더 추가
- [ ] 보안: 토큰 만료 시간, refresh 로직 검토
