# Goal 01 - CI Stability and Release Confidence

이 문서는 `docs/GOAL_TEMPLATE.md`를 실제로 채운 첫 운영 Goal 초안입니다.

## Goal Card

- Goal ID: G-01
- Goal 제목: CI 안정화와 릴리즈 신뢰도 확보
- 기간: 2026-04-06 ~ 2026-04-19 (2주)
- Owner (CEO): Product/PM Owner
- Tech Owner (CTO): Tech Lead
- 상태: active

## Why (배경)

- 현재 web/mobile 이중 파이프라인에서 실패 원인이 분산되어, PR 처리 속도와 배포 확신이 떨어질 수 있다.
- Goal은 "릴리즈 가능한 상태를 빠르게 확인"하는 기본 체계를 만드는 데 집중한다.

## Success Metrics (KPI 2~3개)

- KPI 1: PR CI 1회 통과율(First-pass success)
  - 현재값: TBD (첫 주 측정)
  - 목표값: 80% 이상
  - 측정 방법: GitHub Actions 최근 2주 PR 실행 로그 기준
- KPI 2: CI 실패 원인 재발률(동일 원인 반복)
  - 현재값: TBD (첫 주 측정)
  - 목표값: 같은 원인 2회 이상 반복 0건
  - 측정 방법: 실패 이슈 태깅(`ci:web`, `ci:mobile`, `ci:infra`) 기록
- KPI 3: 머지 전 로컬 검증 수행률
  - 현재값: 수동/비정형
  - 목표값: PR의 90% 이상이 체크리스트 충족
  - 측정 방법: PR 본문 체크리스트 확인

## Scope

### In Scope (이번에 한다)

- CI 기준 명확화: web/mobile 머지 게이트와 로컬 검증 명시
- 실패 분류 체계 도입: 원인 태그와 재발 추적
- PR 체크리스트 표준화: 최소 검증 항목 통일

### Out of Scope (이번에 안 한다)

- 테스트 프레임워크 전면 교체
- 대규모 리팩터링(기능 변경과 무관한 코드 정리)
- 인프라 플랫폼 이전

## Risks and Guards

- 핵심 리스크 1: 모바일 E2E 변동성으로 CI 실패가 잦아질 수 있음
  - 완화 전략: 실패 원인 분류 후 flaky 테스트 우선순위 분리, 재현 스텝 문서화
- 핵심 리스크 2: 린트 범위 확대로 즉시 실패가 늘어날 수 있음
  - 완화 전략: `lint:web` 점진 확장 원칙 유지, 경로 추가 전 청소 완료

## Execution Plan (Issue 단위)

- Issue A: CI 실패 분류 규칙 수립
  - 목적: 실패 원인 기록 표준을 만들어 재발 제어
  - 완료 기준: 실패 분류 태그와 기록 포맷 문서화, 첫 주 1회 적용
  - 담당: CTO
- Issue B: PR 검증 체크리스트 표준 적용
  - 목적: 머지 전 검증 누락 방지
  - 완료 기준: PR 템플릿 또는 운영 문서에 공통 체크리스트 반영
  - 담당: Engineer
- Issue C: lint gate 확장 후보 선정 및 정리
  - 목적: CI 품질 게이트를 안전하게 확대
  - 완료 기준: 후보 경로 1~2개 선정 + 선행 lint 정리 완료
  - 담당: Engineer
- Issue D: 주간 CI 리포트(1페이지) 운영
  - 목적: KPI 추세와 병목을 주간 의사결정에 연결
  - 완료 기준: KPI 3개와 다음 주 액션 포함한 리포트 1회 발행
  - 담당: CEO/CTO

## Review Cadence

- 주간 점검 요일: 금요일
- 중간 중단 조건: 동일 실패 원인 2회 반복 또는 릴리즈 블로커 발생
- Goal 종료 조건: KPI 1~3 중 2개 이상 달성 + 다음 확장 Goal 정의

## Final Check

- [x] KPI 기준이 수치로 정의되었다.
- [x] 이번 Goal에서 하지 않을 항목이 명확하다.
- [x] 각 Issue에 완료 기준이 있다.
- [x] 보안/성능/릴리즈 리스크 점검 항목이 있다.
