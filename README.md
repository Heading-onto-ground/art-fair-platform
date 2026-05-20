# ROB Art Fair Platform

아티스트의 활동 기록을 신뢰 가능한 포트폴리오로 만들고,  
갤러리의 발굴-검증-연결 비용을 줄여 실제 협업/전시 기회를 높이는 운영 플랫폼입니다.

핵심 가치는 아래 3가지입니다.

- 아티스트: 전시/활동 이력을 구조화해 "증명 가능한 커리어 프로필"을 구축
- 갤러리: 후보 탐색과 1차 검증 시간을 줄이고, 아웃리치 파이프라인을 체계화
- 플랫폼: 발견(Discovery) -> 검증(Validation) -> 연결(Outreach) -> 운영(Workflow) 루프 제공

## Why Users Join

### For Artists

- 작업과 전시 기록을 누적해 신뢰도 높은 프로필을 만든다.
- SNS에 흩어진 정보가 아닌, 큐레이터/갤러리가 보기 쉬운 형태로 정리한다.
- 오픈콜/협업/전시 제안 같은 기회 연결 가능성을 높인다.

### For Galleries

- 작가 탐색 시간을 줄이고, 데이터 기반으로 후보를 빠르게 선별한다.
- 아웃리치 메시지와 후속 관리 과정을 표준화해 파이프라인으로 운영한다.
- 팀 내에서 검토 근거를 공유해 의사결정을 빠르게 한다.

## Product Surfaces

- Web: Next.js 13 App Router 기반 플랫폼
- Mobile: Expo 앱 (`mobile/`) 기반 베타 경험
- Data/DB: Prisma (`prisma/`)

## Development

웹(루트) 개발 서버 실행:

```bash
npm run dev
```

웹 검증:

```bash
npm run lint:web
npm run typecheck
npm run test
npm run build
```

모바일 검증:

```bash
cd mobile && npm run lint && npm run typecheck && npm run test
```

### Community magazine (optional)

- `OPENAI_API_KEY` – `/community` PDF 매거진의 **AI 요약** 사용 (없으면 키워드 기반으로 동작)
- `COMMUNITY_MAGAZINE_MODEL` – 기본값 `gpt-4o-mini`
- `OPENAI_BASE_URL` – OpenAI 호환 API 엔드포인트(선택, 기본 `https://api.openai.com/v1`)

Vercel 등 배포 환경에서 AI 요약을 쓰려면 위 키를 환경 변수로 설정하면 됩니다.

## Operating Docs

- 운영 원칙: `docs/AI_AGENT_OPERATING_RULES.md`
- 보안 강화 체크리스트: `docs/SECURITY_HARDENING_CHECKLIST.md`
- Goal 템플릿: `docs/GOAL_TEMPLATE.md`
- 작업 루프: `docs/WORK_LOOP_TEMPLATE.md`
- 오토파일럿 런북: `docs/AUTOPILOT_RUNBOOK.md`
- 이슈 백로그: `docs/ISSUE_BACKLOG_AUTOPILOT.md`
