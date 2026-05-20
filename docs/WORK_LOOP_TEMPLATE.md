# Work Loop Template (Request -> Build -> Verify -> Report)

이 문서는 Engineer가 매 작업마다 따르는 실행 루프입니다.
작업 시작 전에 복붙해서 체크하세요.

## 0) Intake (요청 확인)

- Issue 링크:
- 연결 Goal ID:
- 요청 요약 (1~2문장):
- 완료 조건 (DoD):
  - [ ] 코드 변경 완료
  - [ ] 검증 명시
  - [ ] 변경 이유 설명 가능

## 1) Plan (짧은 계획)

- 접근 방법:
- 변경 파일 후보:
- 예상 리스크:
- 결정 필요 사항(있으면):

규칙:
- 30분 이상 설계가 길어지면 CTO 결정 요청
- 범위가 늘어나면 새 Issue로 분리

## 2) Build (구현)

- 실제 변경 파일:
- 핵심 변경 내용:
- 범위 외 변경 여부: 없음 | 있음(별도 Issue)

## 3) Verify (검증)

웹 기준 기본 검증:

- `npm run lint:web`
- `npm run typecheck`
- `npm run test`
- 변경 범위가 크면 `npm run build`

모바일 변경이 포함되면 추가:

- `cd mobile && npm run lint && npm run typecheck && npm run test`

검증 결과:

- lint:
- typecheck:
- test:
- build(선택):
- 수동 확인 항목:

## 4) Report (작업 리포트)

- 결과: done | partial | blocked
- 사용자 영향:
- 리스크/주의점:
- 다음 액션:
- 리뷰 요청 포인트:

## 5) Stop Rule (중단 규칙)

아래 중 하나면 즉시 중단 후 공유:

- 동일 에러로 2회 이상 실패
- 요구사항 해석이 2개 이상 가능
- 보안/권한/결제 영향이 의심됨
- 배포 리스크가 큰데 롤백 경로가 불명확

중단 시 공유 포맷:

- 현재 상태:
- 실패 가설:
- 필요한 결정 1개:
- 추천 옵션 A/B:
