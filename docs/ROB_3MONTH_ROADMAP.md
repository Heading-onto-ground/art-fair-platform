# ROB 3개월 실행 로드맵 (C 방향)

**전략**: Ritual(스트릭·연습 기록)과 Bridge(작가 프로필·타임라인·네트워크)를 모두 키우면서, 점진적으로 하나의 앱으로 통합

**목표**: 사용자가 "ROB 하나만 켜면 된다"고 느끼게 만들기

---

## Phase 1: 1개월차 (안정화 + 검증) — 3월 말 ~ 4월 말

### 주요 목표
실제 데이터로 가설 검증하기

### 실행 과제

#### 1. 베타 테스트 실시 (가장 중요)
- **대상**: 작가 20~30명 (Threads에서 적극 모집)
- **기간**: 3주
- **측정 지표**:
  - "전체 프로필 보기" 버튼 클릭률
  - 웹 프로필 체류 시간
  - Add Exhibition 사용 횟수
  - Ritual(스트릭)과 Bridge(프로필) 동시 사용 여부
  - 불편했던 점 상세 피드백

#### 2. 웹 프로필 V2 최종 폴리싱
- [x] Alert 문구 최종 적용
- [x] 웹 프로필 상단에 "앱으로 돌아가기" 버튼 추가
- [ ] Empty State, Timeline, Network 모바일 미세 조정

#### 3. 앱 내 연결 강화
- [x] Profile 탭 버튼 위치·디자인 확정 (스트릭 카드 바로 아래)
- [x] Feed 카드 클릭 시 Alert → 웹 이동 로직 안정화

### 1개월차 완료 기준
- [ ] 베타 피드백 20건 이상 수집
- [ ] "전체 프로필 보기" 클릭률 15% 이상

---

## Phase 2: 2개월차 (연결 강화 + 부분 네이티브화) — 5월

### 주요 목표
앱 안에서 Bridge 경험을 조금씩 늘리기

### 실행 과제

#### 1. WebView 도입 검토 및 시범 적용
- [ ] 작가 프로필 V2를 WebView로 앱 내에서 보여주는 옵션 구현 (선택적)
- [ ] 또는 Timeline + Add Exhibition 중 1개 화면을 React Native로 포팅 시작

#### 2. 통합 네비게이션 설계
- [ ] Ritual 탭과 Bridge 탭을 부드럽게 전환할 수 있는 구조 설계
- [ ] 하단 탭에 "Bridge" 탭 신설 검토 (또는 "프로필" 탭 강화)

#### 3. 크로스 플랫폼 데이터 동기화
- [ ] 웹에서 등록한 전시가 앱 Ritual에도 반영되도록 연동 준비

### 2개월차 완료 기준
- [ ] Timeline 또는 Add Exhibition 중 최소 1개 화면을 React Native로 구현 완료
- [ ] WebView 또는 네이티브 프로필을 앱 내에서 테스트 가능

---

## Phase 3: 3개월차 (통합 기반 마련) — 6월

### 주요 목표
Ritual과 Bridge를 하나의 경험으로 느끼게 하기

### 실행 과제

#### 1. Network 네이티브 구현 (우선순위 높음)
- [ ] 원형 노드 그래프 React Native 포팅
- [ ] 모바일 터치·줌 최적화

#### 2. 통합 사용자 경험 설계
- [ ] Ritual 스트릭 ↔ Bridge 타임라인 자연스러운 연결
- [ ] 단일 로그인·프로필 관리 시스템 강화

#### 3. 전체 브랜딩 통합
- [ ] "ROB"이라는 하나의 아이덴티티로 사용자에게 전달
- [ ] 앱 아이콘, 온보딩, 네이밍 정리

### 3개월차 완료 기준
- [ ] 앱 내에서 Bridge 핵심 기능(Timeline + Add Exhibition + 간단 Network)을 네이티브로 사용 가능
- [ ] Ritual과 Bridge가 하나의 앱 안에서 조화롭게 느껴지는 구조 마련

---

## A 선택: 3주 실행 계획

**베타 모집 2~3주 미루고, 앱에 Timeline + Add Exhibition 구현 후 진행**

- **Week 1**: [WEEK1_EXECUTION_PLAN.md](./WEEK1_EXECUTION_PLAN.md) — Timeline + Add Exhibition 최소 구현
- **Week 2**: Network 카드, 네비게이션, Empty State
- **Week 3**: 베타 모집 및 테스트

---

## 현재 달성 상태 (2026년 3월)

| 항목 | 상태 |
|------|------|
| 웹 프로필 V2 (Hero, Timeline, Network, Add Exhibition) | ✅ 완성 |
| 웹 모바일 최적화 | ✅ 완료 |
| 앱 ↔ 웹 Linking 연결 | ✅ 완료 |
| Profile "전체 프로필 보기" 버튼 | ✅ 완료 |
| Feed 작가 카드 → 웹 프로필 | ✅ 완료 |
| 웹 "앱으로 돌아가기" 버튼 | ✅ 완료 |
| 앱 내 Timeline (네이티브) | 🔲 Week 1 |
| 앱 내 Add Exhibition | 🔲 Week 1 |
| 베타 테스트 | 🔲 Week 3 |

---

## 참고

- **앱 딥링크 스킴**: `rob-ritual://` (mobile/app.json)
- **웹 프로필 URL**: `{API_BASE_URL}/artist/public/{artistId}`
