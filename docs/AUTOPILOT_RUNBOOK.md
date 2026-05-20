# Autopilot Runbook (3 Goals)

이 문서는 에이전트가 3개 목표를 "알아서" 운영할 수 있도록 만든 실행 보드다.
완전 무인보다, 고위험 액션은 승인 게이트를 두는 반자동 운영을 기본으로 한다.

## Active Goal Order

1. G-01: `docs/GOAL_01_CI_STABILITY.md` (플랫폼 안정화)
2. G-02: `docs/GOAL_02_GALLERY_OUTREACH.md` (갤러리 리드/DM)
3. G-03: `docs/GOAL_03_ARTIST_SNS_MARKETING.md` (아티스트 모집 마케팅)

규칙:

- G-01이 `active`일 때 전체 실행 시간의 50% 이상 배정
- G-02/G-03는 각각 25% 이내로 시작
- 장애나 CI 블로커 발생 시 모든 Goal보다 G-01 우선

## Daily Loop (매일 반복)

### 1) CEO Agent - Prioritize

- 전일 KPI 확인
- 오늘 처리할 Issue 1~3개 선택
- 각 Issue의 완료 조건/중단 조건 확정

### 2) CTO Agent - Design and Risk

- 실행 접근 검토
- 보안/정책/법적 리스크 확인
- 승인 필요 작업 태깅 (`needs-approval`)

### 3) Engineer Agent - Execute

- `docs/WORK_LOOP_TEMPLATE.md` 기준으로 구현/검증/리포트
- 실패 2회 반복 시 즉시 중단 후 의사결정 요청

### 4) Reporter Agent - End of Day

- 오늘 완료/부분완료/막힘 정리
- KPI 변화 요약
- 내일 우선순위 제안

## Daily Journal Policy (고정 시간 업무일지)

- 기록 시간: 매일 18:00 KST
- 자동 생성 위치: `docs/worklogs/YYYY-MM-DD.md`
- 생성 방식: `.github/workflows/agent-daily-journal.yml` 스케줄 실행
- 포맷 기준: `docs/DAILY_JOURNAL_TEMPLATE.md`
- 기록 원칙:
  - 작업 종료 시 해당 일지에 진행 로그 1줄 이상 추가
  - Blocked 항목은 원인 + 필요한 승인 1개를 반드시 기록
  - 외부 발송 기록 규칙: 이메일은 자동 발송 로그(시간/대상/캠페인) 기록, DM은 수동 발송자/시간 기록

## Approval Gates (필수 승인 작업)

아래는 자동 실행 금지, 사람 승인 후 진행:

- 외부 DM/댓글 자동 발송
- 계정 제재 위험이 있는 수집/자동화 시도
- 개인정보/민감정보 저장 스키마 변경
- 결제, 인증, 관리자 권한 관련 변경

이메일은 아래 조건에서 자동 발송 허용:

- 옵트아웃(수신 거부) 반영
- 발송 빈도 제한(캠페인 기준)
- 발송 결과 및 실패 로그 보관

## DM Safety Policy (G-02)

- 리드 품질 점수 임계값 미달은 발송 금지
- 동일 계정 반복 접촉 쿨다운 적용 (예: 14일)
- 메시지 템플릿은 사실 기반, 과장/허위 표현 금지
- 차단/신고 신호가 나오면 즉시 캠페인 중지

## `isBlocked` Weekly Ops (G-02)

- 기준 문서: `docs/G02_LEAD_SCHEMA_AND_EMAIL_POLICY.md`
- 주 1회 차단 목록 점검:
  - 신규 opt-out / hard bounce / complaint 항목 즉시 반영
  - 반복 soft bounce 후보 검토 후 차단 전환
- 해제는 사람 승인 후 수행, 사유를 업무일지에 기록

## KPI Snapshot Format (Daily)

- G-01
  - CI first-pass success:
  - Repeated failure count:
- G-02
  - New qualified leads:
  - DM response rate (7d rolling):
- G-03
  - Weekly artist leads:
  - Landing conversion:

## Weekly Review (30 minutes)

- 유지: 효과 있었던 자동화
- 중단: 정책/비용/품질 리스크 큰 루프
- 개선: 다음 주 실험 1~2개만 선정

## Immediate Next Actions

- [x] G-01~G-03 이슈 백로그 초안 작성 (`docs/ISSUE_BACKLOG_AUTOPILOT.md`)
- [x] 고정 시간 업무일지 자동 생성 워크플로 추가
- [x] G-02 리드 스키마와 이메일 정책 확정 (`docs/G02_LEAD_SCHEMA_AND_EMAIL_POLICY.md`)
- [ ] G-03 채널별 CTA 매트릭스 작성
- [x] 플랫폼 소개/실행 계획 문서 추가 (`docs/GO_TO_MARKET_AND_AUTOMATION_PLAN.md`)
