# Week 1 실행 계획 (A 선택) — 수정판

**목표**: 앱 안에서 "전시 등록 → 타임라인에 뜨는 것"까지 체험 가능하게 만들기

**원칙**: 검증을 먼저 하고, 확인된 뒤에 본격 구현에 들어간다.

---

## Day 1 (오늘/내일) — 검증 우선 ⚠️

**이 단계를 통과하기 전에는 Day 2 이후 작업을 시작하지 않는다.**

### 1.1 api/auth/me 응답 확인

- [ ] `GET {API_BASE_URL}/api/auth/me?lite=1` 호출
- [ ] 응답에 `profile.artistId`가 포함되는지 확인
- [ ] artist가 없을 때(프로필 미생성): `profile`이 null인지, artistId 대체 가능한지 확인

**확인 방법**: 모바일 앱에 임시 디버그 화면 추가하거나, 로그인 후 fetch 호출 결과를 Alert로 출력

### 1.2 모바일 인증(쿠키/토큰) 테스트

- [ ] 실제 API 서버에 로그인 (베타/개발용 계정)
- [ ] `credentials: "include"`로 `GET /api/artist/self-exhibitions` 호출
- [ ] 200 + 정상 데이터가 오는지 확인
- [ ] 401이면: 쿠키 미전달 → Bearer 토큰 등 대체 방안 검토

### 1.3 인증 실패 시 대체 방안

- [ ] 로그인 유도 화면 (이미 있음)
- [ ] 쿠키 미동작 시: 백엔드에 `Authorization: Bearer` 지원 추가 여부 결정

**Day 1 완료 기준**: 위 1.1, 1.2가 모두 통과해야 Day 2로 진행 가능.

**검증 도구**:
- 모바일: Profile 탭 → "Day 1 검증 (개발용)" (__DEV__에서만 표시)
- 웹: `/verify-day1` 페이지
- **GO/NO-GO 판단**: `docs/DAY1_GO_NOGO_CHECKLIST.md`
- 대체 전략: `docs/DAY1_FALLBACK_STRATEGY.md`

---

## Day 2–3 — Timeline 읽기 전용 화면

**전제**: Day 1 검증 완료

### 2.1 exhibitionService.ts 생성

- `fetchArtistProfile(artistId)` → GET /api/artist/public/[artistId]
- `fetchMyExhibitions()` → GET /api/artist/self-exhibitions (credentials: include)

### 2.2 Timeline 화면

- 날짜순 정렬된 카드 리스트
- 각 카드: 날짜, 제목, 장소(space/venue)
- Empty State: "아직 기록된 활동이 없어요" + Add Exhibition 버튼

### 2.3 웹 데이터 연동 확인

- [ ] 웹에서 등록한 전시가 앱 Timeline에 표시되는지 확인

---

## Day 4–5 — Add Exhibition 최소 버전

### 3.1 필수 필드만 구현

| 필드 | 필수 |
|------|------|
| Exhibition Title | ✅ |
| Start Date | ✅ |
| End Date | (선택) |
| Venue / Space | ✅ |

### 3.2 API 연동

- POST /api/artist/self-exhibitions
- 저장 후 Timeline 새로고침

### 3.3 동작 확인

- [ ] 앱에서 전시 등록 후 Timeline에 바로 반영되는지 확인

---

## Day 6–7 — 통합 및 내부 테스트

### 4.1 네비게이션

- Ritual ↔ Bridge 네비게이션 연결
- "전시" 카드 탭 → Timeline 화면
- Add Exhibition FAB/버튼 → 모달

### 4.2 정리

- 에러 처리, 로딩 상태
- 실제 디바이스 2~3대에서 동작 테스트

---

## 체크리스트 (Week 1 완료 기준)

- [ ] **Day 1**: api/auth/me artistId 확인, 모바일 인증 동작 확인
- [ ] **Day 2–3**: Timeline 화면에서 전시 목록 표시 (읽기 전용)
- [ ] **Day 4–5**: Add Exhibition 모달에서 전시 등록 가능
- [ ] **Day 6–7**: 등록 후 Timeline 반영, Empty State, 에러 처리

---

## 다음 (Week 2)

- Network 카드 리스트
- Venue 자동완성
- Collaborators 멀티셀렉트
