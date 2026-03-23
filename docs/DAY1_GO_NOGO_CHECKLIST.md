# Day 1 → Week 1 GO/NO-GO 실전 체크표

**목적**: verify-day1 실행 결과를 보고 바로 판단할 수 있는 체크표

---

## 1. verify-day1 결과 → 즉시 판단

### Step 1: auth/me 결과

| 화면 표시 | HTTP | session | 판단 | 액션 |
|-----------|------|---------|------|------|
| ✅ 성공 | 200 | 있음 | GO 후보 | Step 2로 |
| ❌ 실패 | 401/403 | 없음 | **NO-GO** | 케이스 A 대응 |
| ❌ 실패 | 500 | — | **NO-GO** | 서버 로그 확인 |
| ❌ 실패 | 네트워크 오류 | — | **NO-GO** | CORS/URL/네트워크 확인 |

### Step 2: profile.artistId 결과

| 화면 표시 | artistId | 판단 | 액션 |
|-----------|----------|------|------|
| ✅ 성공 | ART-xxx 형태 | GO 후보 | Step 3로 |
| ❌ 실패 | 없음 (profile 있음) | **조건부 GO** | 케이스 B 대응 후 진행 |
| ❌ 실패 | 없음 (profile null) | **NO-GO** | 프로필 생성 플로우 필요 |

### Step 3: self-exhibitions 결과

| 화면 표시 | HTTP | exhibitions | 판단 | 액션 |
|-----------|------|--------------|------|------|
| ✅ 성공 | 200 | 배열 (빈 배열 OK) | **GO** | Week 1 진입 |
| ❌ 실패 | 401 | — | **NO-GO** | 케이스 A (쿠키 미전달) |
| ❌ 실패 | 500 | — | **NO-GO** | API 서버 확인 |
| ⏭️ 스킵 | — | — | Step 1 실패 시 | Step 1 먼저 해결 |

---

## 2. 최종 판단 매트릭스

| auth/me | artistId | self-exhibitions | 판단 |
|---------|----------|-----------------|------|
| ✅ | ✅ | ✅ | **바로 GO** |
| ✅ | ✅ | ❌ | **NO-GO** (credentials 문제) |
| ✅ | ❌ | ⏭️ | **조건부 GO** (artistId fallback 후 진행) |
| ❌ | — | — | **NO-GO** |

---

## 3. 실패 로그별 GO-NO-GO 표

### verify-day1 화면/로그에서 보이는 메시지 → 판단

| 메시지/증상 | 판단 | 다음 액션 |
|-------------|------|-----------|
| `세션 없음 (쿠키 미전달 또는 미로그인)` | NO-GO | 케이스 A |
| `세션 있음, 프로필 없음` | 조건부 GO | 케이스 B (onboarding) |
| `profile.artistId 없음` | 조건부 GO | 케이스 B |
| `401 — unauthorized` (self-exhibitions) | NO-GO | 케이스 A |
| `전시 N개 (credentials OK)` | GO | Week 1 진입 |
| `네트워크 오류` | NO-GO | URL, CORS, 네트워크 확인 |

### Metro 콘솔 [Day1] 로그 → 판단

| 로그 내용 | 판단 |
|-----------|------|
| `auth/me response { status: 200, hasSession: true, hasProfile: true, artistId: "ART-xxx" }` | GO |
| `auth/me response { status: 200, hasSession: false }` | NO-GO (쿠키) |
| `auth/me response { status: 401 }` | NO-GO |
| `self-exhibitions response { status: 200, ok: true }` | credentials OK |
| `self-exhibitions response { status: 401 }` | NO-GO (쿠키) |

---

## 4. 실패 케이스별 대응 (요약)

| 케이스 | 증상 | 우선 대응 | Week 1 전 필수? |
|--------|------|-----------|-----------------|
| **A** | auth/me 실패, 쿠키 미전달 | SameSite=None 또는 Bearer 토큰 | ✅ |
| **B** | artistId 없음 | onboarding 분기, fallback 규칙 | 조건부 |
| **C** | self-exhibitions 실패 | 빈 배열 vs 에러 구분, 응답 검증 | ✅ |
| **D** | 로컬만 되고 실제 기기에서 깨짐 | 실제 기기 + 재실행 테스트 | ✅ |

상세: `docs/DAY1_FALLBACK_STRATEGY.md`

---

## 5. 바로 GO 체크리스트 (5개)

아래 **모두** 충족 시 Week 1 진입:

- [ ] 로그인 후 auth/me **3회 연속** 성공
- [ ] 앱 **재실행** 후에도 인증 유지
- [ ] **artistId** 정상 확인 (화면에 표시됨)
- [ ] self-exhibitions **정상 응답** (200, 배열)
- [ ] 실패 시 **에러 코드/메시지**가 화면 또는 로그에 남음

---

## 6. Week 1 진입 시 우선순위

| 순위 | 항목 | 내용 |
|------|------|------|
| 1 | 인증/세션 안정화 | auth 상태 전역, 로딩/실패/미로그인 구분, artistId fallback |
| 2 | 데이터 상태 모델 | exhibition 최소 스키마 확정 |
| 3 | Timeline | loading / empty / error / populated 4상태 |
| 4 | Add Exhibition | 최소 필드 (제목, 장소, 시작일, 종료일) |
| 5 | 관측성 | API 로그, 실패 코드, auth 상태 표시 |

---

## 7. Day 1.5 권장 플로우

```
verify-day1 실행
    ↓
이 체크표로 GO/NO-GO 판단
    ↓
GO → Week 1 Day 2 (auth 전역 상태) 시작
조건부 GO → 인증/artistId 안정화 후 Day 2
NO-GO → Day 1 연장 (인증 구조 수정)
```

---

## 8. 관련 문서

- 실행 방법: `docs/DAY1_VERIFY_RUN.md`
- 대체 전략: `docs/DAY1_FALLBACK_STRATEGY.md`
- Week 1 계획: `docs/WEEK1_EXECUTION_PLAN.md`
