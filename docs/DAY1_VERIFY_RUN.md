# Day 1 검증 실행 방법

## 목표

- `api/auth/me?lite=1` 호출
- `profile.artistId` 존재 여부 확인
- `GET /api/artist/self-exhibitions` 호출 (credentials 테스트)

---

## 실행 방법

### 1. 모바일 (Expo Go)

```bash
cd mobile
npx expo start --tunnel
```

1. **로그아웃** 후 **다시 로그인**
   - 베타 모드 ON 시: mock 세션 사용 → API 호출 없음 → 검증 실패 예상
   - **실제 API 검증**: 베타 모드 OFF 필요

2. **베타 모드 OFF** (실제 API 사용)
   - `mobile/.env` 또는 `app.config.js`에서 `EXPO_PUBLIC_BETA=0` 설정
   - 또는 `EXPO_PUBLIC_BETA` 제거
   - **앱 재시작** (npx expo start 다시 실행)

3. **Profile 탭** → **"Day 1 검증 (개발용)"** 버튼 탭
   - `__DEV__`에서만 표시됨

4. **"검증 실행"** 버튼 탭

5. **결과 확인**
   - Step 1: auth/me — 성공/실패
   - Step 2: profile.artistId — 성공/실패
   - Step 3: self-exhibitions — 성공/실패 (credentials 전달 여부)

### 2. 웹

```
/verify-day1
```

- 브라우저에서 로그인 후 `/verify-day1` 접속
- "검증 실행" 클릭

---

## 디버깅 로그

Metro/Expo 콘솔에서 `[Day1]` 또는 `[ArtistRitual]` 접두사로 출력:

```
[ArtistRitual] [DEBUG] [Day1] fetchAuthMe { url: "...", credentials: "include" }
[ArtistRitual] [DEBUG] [Day1] auth/me response { status: 200, ok: true, ... }
[ArtistRitual] [DEBUG] [Day1] fetchSelfExhibitions { url: "...", credentials: "include" }
[ArtistRitual] [DEBUG] [Day1] self-exhibitions response { status: 200, ok: true, count: 0 }
```

---

## credentials: "include" 확인

- `mobile/services/api/authMeService.ts`에서 모든 fetch 호출에 `credentials: "include"` 적용
- 화면 Step 1, 3에 "credentials: \"include\"" 표시

---

## 실패 시

- **GO/NO-GO 판단**: `docs/DAY1_GO_NOGO_CHECKLIST.md`
- **대체 전략**: `docs/DAY1_FALLBACK_STRATEGY.md`
- 쿠키 미전달: `sameSite: "none"` 또는 Bearer 토큰 전환 검토
