# G-02 Lead Schema and Email Policy

이 문서는 `G-02/A` 이슈를 위한 실행 기준입니다.
목표는 리드 수집을 안전하게 운영하고, 이메일 자동 발송을 정책 준수 상태로 유지하는 것입니다.

## 1) 리드 스키마 (저장 허용 필드)

필수:

- `email`: 갤러리 연락 이메일
- `galleryName`: 갤러리명
- `country`: 국가
- `language`: 언어(`en|ko|ja|fr|de|it|zh`)
- `source`: 수집 출처(`internal_gallery|external_directory|open_call|website_discovery`)
- `qualityScore`: 품질 점수(0~100)
- `isActive`: 활성 여부
- `isBlocked`: 발송 차단 여부
- `lastSeenAt`, `createdAt`, `updatedAt`

선택:

- `city`
- `website`
- `galleryId` (내부 매핑용)

## 2) 저장 금지/주의 필드

저장 금지:

- 개인 전화번호, 개인 주소, 주민/신분 식별정보
- 소셜 계정 비밀번호, 쿠키/세션 토큰 등 인증정보
- 목적과 무관한 메모(민감한 평가/차별적 정보)

주의 저장:

- 담당자 개인 이름은 필수 목적이 아니면 저장하지 않음
- 메일 본문 전문(raw full thread)은 기본 저장 금지 (요약/로그만)

## 3) 이메일 자동 발송 정책

자동 허용 범위:

- 갤러리 대상 아웃리치 이메일
- 온보딩/리텐션/주간 다이제스트 같은 플랫폼 운영 메일

필수 조건:

- 차단 목록(`isBlocked = true`) 자동 제외
- 쿨다운 적용: 동일 이메일 재발송 최소 21일 간격
- 일일 상한 적용: 기본 40건 (`OUTREACH_DAILY_LIMIT`)
- 최소 품질 점수: 기본 60점 (`OUTREACH_MIN_QUALITY`)
- 발송 로그 기록: `OutreachRecord`, `EmailLog`
- 수신거부 링크 자동 포함: `/api/outreach/unsubscribe?token=...`
- 수신거부 처리 시 `isBlocked = true`, `OutreachRecord.status = unsubscribed`

## 4) DM 정책

- DM은 수동 발송
- 에이전트 자동화 범위는 "대상 추천 + 초안 생성 + 발송 큐 정리"까지
- 실제 전송은 사람이 수행하고 업무일지에 기록

## 5) 보관/정리 정책

- 장기 미사용(`isActive = false`) 또는 반송/클레임 반복 리드는 비활성화
- 반송/거부 리드는 `isBlocked = true` 처리
- 주 1회 리드 디렉토리 정리(중복/저품질/placeholder 제거)

## 6) 운영 체크리스트

- [ ] 신규 리드가 필수 필드를 충족한다.
- [ ] 발송 전 차단/쿨다운/일일 상한이 적용된다.
- [ ] 발송 결과(성공/실패)가 로그에 남는다.
- [ ] DM은 수동 발송으로 분리되어 있다.

## 7) `isBlocked` 운영 규칙 (에이전트 팀용)

### A. 즉시 차단(`isBlocked = true`)

아래 조건 중 1개라도 충족하면 즉시 차단:

- 수신 거부(명시적 unsubscribe/opt-out 요청)
- 하드 바운스(존재하지 않는 이메일, 도메인 없음)
- 스팸 신고/클레임 발생

### B. 조건부 차단(검토 후 차단)

- 소프트 바운스 3회 연속
- 30일 내 미응답이 반복되고 반응 신호가 없는 경우
- 메일 정책 위반 위험 신호(반송 급증, 클레임 급증)

### C. 해제(`isBlocked = false`) 조건

- 상대가 명시적으로 수신 재동의
- 주소 정정 후 유효성 검증 완료
- 운영자 승인(사유 기록 필수)

### D. 책임 분담

- Engineer Agent: 로그 기반 후보 추출, 차단/해제 제안
- CTO Agent: 정책 적합성 검토
- Owner(사람): 최종 승인

### E. 기록 포맷(업무일지 필수)

- 대상 이메일:
- 조치: block | unblock
- 사유 코드: optout | hard_bounce | complaint | repeated_soft_bounce | manual_review
- 승인자:
- 처리 시각(KST):
