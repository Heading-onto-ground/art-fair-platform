# Artist Ritual — 구현 로드맵

CTO 관점의 구현 우선순위. 네트워크 효과가 생기는 축부터 순차 구현.

---

## 완료 ✅

### 1. UX 문구 교체 (제품 정체성)
- `Save Moment` → `Record practice`
- `Saving...` → `Recording...`
- `Upload` → `Add from gallery`
- `Record today's practice` / `What are you working on right now?`
- `Ritual Posts` → `Practice sessions`
- `Daily reminder` → `Daily practice prompt`

### 2. Practice Identity 강화
- 기록 직후: `🔥 Day X` + Micro Milestone (Day 1/3/7/30) + `See you tomorrow.`
- 오늘 기록 완료 시: `You showed up today. ✓`
- 피드/기록 화면: `Messy studio welcome. Sketches count. Experiments count.`
- 이미지 플레이스홀더: `Work in progress welcome` / `Sketches · experiments · messy studio`

### 3. Daily Practice Prompt
- 알림: `It's practice time` / `Record today's moment.`
- 20:00 (8 PM) 하루 1회

---

## 완료 ✅ (추가)

### 4. Artists Working Now
- 피드 상단: `🔥 Artists working now`
- `last 30 minutes` moment 조회
- API: `GET /api/artist/moments?recent=true` (public)
- Medium chips: painting, drawing, sculpture...

### 5. ROB Practice Layer ✅
- ROB 프로필에 Practice 섹션
- Current streak, Total sessions, Active days
- Recent practice logs
- **Practice Graph** (GitHub-style, last 90 days)
- `GET /api/artist/public/[artistId]/ritual-summary` (activeDays, practiceGraphData)

---

## 다음 단계

### 6. 사용자 시간대 기반 알림
- 현재: 20:00 고정
- 목표: 사용자 시간대 기반 Daily Practice Prompt

---

## 참고

- [PRIVATE_BETA_GUIDE.md](../PRIVATE_BETA_GUIDE.md) — 테스터용 가이드 (CTO 관찰 포인트 포함)
